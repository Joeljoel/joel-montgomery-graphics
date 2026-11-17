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
      'body > main.card.small{left:30px;top:100px;width:252px;height:600px;border-radius:12px}' +
      '</style><main class="card"><span class="utilities-surface"></span></main>');
    for (const small of [true, false]) {
      await page.evaluate(small => {
        window.__vt = document.startViewTransition(() =>
          document.querySelector('main').classList.toggle('small', small));
      }, small);
      await page.evaluate(() => window.__vt.ready);
      // Pause the actual group animation, and sample the rendered
      // geometry at evenly spaced points rather than relying on wall time.
      const samples = await page.evaluate(() => {
        const animation = document.getAnimations().find(a =>
          a.effect?.pseudoElement === '::view-transition-group(utilities-surface)' ||
          a.animationName?.startsWith('-ua-view-transition-group-anim-utilities-surface'));
        if (!animation) throw Error('Missing surface geometry animation');
        animation.pause();
        return [0, 75, 150, 300, 450, 599].map(time => {
          animation.currentTime = time;
          const root = document.documentElement;
          const group = getComputedStyle(root, '::view-transition-group(utilities-surface)');
          const image = getComputedStyle(root, '::view-transition-new(utilities-surface)');
          return { width: parseFloat(group.width), height: parseFloat(group.height),
            background: group.backgroundColor, opacity: image.opacity };
        });
      });
      for (const sample of samples) {
        assert.ok(sample.width >= 251 && sample.width <= 921, JSON.stringify(sample));
        assert.ok(sample.height >= 599 && sample.height <= 711, JSON.stringify(sample));
        assert.equal(sample.background, 'rgb(255, 255, 255)');
        assert.equal(sample.opacity, '0');
      }
      await page.evaluate(() => {
        document.getAnimations().forEach(animation => animation.play());
        return window.__vt.finished;
      });
    }
    console.log('PASS: rectangle stays opaque and never overshoots in either morph direction');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
