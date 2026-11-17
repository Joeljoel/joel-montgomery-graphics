// Isolated real Chromium transition test; does not need a web server.
// Run: node tests/utilities-transition-geometry.test.cjs
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
    const css = readFileSync(join(__dirname, '../tools/shared/utilities-shell.css'), 'utf8');
    await page.setContent('<style>' + css + '\n' +
      '*{box-sizing:border-box}body{margin:0;background:#2184fc}' +
      'body > main.card{position:absolute;left:100px;top:75px;width:920px;height:710px;border-radius:18px}' +
      'body.utilities-shell > main.card{left:30px;top:100px;width:252px;height:600px;border-radius:12px;display:block;padding:0;min-height:0}' +
      '.test-return{display:none;position:absolute;bottom:14px;left:12px;view-transition-name:utilities-back-link}' +
      'body.utilities-shell .test-return{display:block}' +
      '</style><main class="card"><span class="utilities-surface"></span><span class="test-return">All utilities</span></main>');
    for (const small of [true, false]) {
      await page.evaluate(small => {
        window.__vt = document.startViewTransition(() =>
          document.body.classList.toggle('utilities-shell', small));
      }, small);
      await page.evaluate(() => window.__vt.ready);
      // Pause all actual pseudo-element animations. Sample simultaneous
      // geometry, radius and return-link opacity at fixed timeline positions.
      const samples = await page.evaluate(small => {
        const animations = document.getAnimations();
        animations.forEach(animation => animation.pause());
        return [0, 50, 100, 200, 300, 399, 450, 499].map(time => {
          animations.forEach(animation => { animation.currentTime = time; });
          const root = document.documentElement;
          const group = getComputedStyle(root, '::view-transition-group(utilities-surface)');
          const pair = getComputedStyle(root, '::view-transition-image-pair(utilities-surface)');
          const image = getComputedStyle(root, '::view-transition-new(utilities-surface)');
          const link = getComputedStyle(root, small
            ? '::view-transition-new(utilities-back-link)' : '::view-transition-old(utilities-back-link)');
          return { time, width: parseFloat(group.width), height: parseFloat(group.height),
            background: pair.backgroundColor, opacity: image.opacity,
            radius: parseFloat(pair.borderTopLeftRadius), linkOpacity: parseFloat(link.opacity) };
        });
      }, small);
      for (const sample of samples) {
        assert.ok(sample.width >= 251 && sample.width <= 921, JSON.stringify(sample));
        assert.ok(sample.height >= 599 && sample.height <= 711, JSON.stringify(sample));
        assert.equal(sample.background, 'rgb(255, 255, 255)');
        assert.equal(sample.opacity, '0');
        assert.ok(sample.radius >= 11.99 && sample.radius <= 18.01);
        if (small && sample.time < 400) assert.equal(sample.linkOpacity, 0);
        if (small && sample.time >= 450) assert.ok(sample.linkOpacity > 0);
        if (!small && sample.time >= 100) assert.equal(sample.linkOpacity, 0);
      }
      assert.ok(Math.abs(samples[0].radius - (small ? 18 : 12)) < .1);
      assert.ok(Math.abs(samples.at(-1).radius - (small ? 12 : 18)) < .1);
      assert.ok(new Set(samples.map(sample => sample.radius)).size > 3);
      await page.evaluate(() => {
        document.getAnimations().forEach(animation => animation.play());
        return window.__vt.finished;
      });
    }
    console.log('PASS: opaque bounded rectangle, interpolated corners and delayed return link in both directions');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
