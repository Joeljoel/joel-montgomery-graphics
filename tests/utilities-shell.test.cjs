// Serve the repository at localhost:8765 and run with Playwright.
// Validates the shared sidebar without changing the individual tool logic.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox']
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    // Hold the enhancement script back: the sidebar and two-column layout
    // must already be present in the HTML before the script runs.
    const slow = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    let releaseScript;
    await slow.route('**/utilities-shell.js?v=3', async route => {
      await new Promise(resolve => { releaseScript = resolve; });
      await route.continue();
    });
    await slow.goto('http://localhost:8765/tools/qr/', { waitUntil: 'commit' });
    await slow.locator('aside.utilities-sidebar').waitFor({ state: 'attached' });
    assert.equal(await slow.locator('body.utilities-shell > main > .utilities-sidebar').isVisible(), true);
    assert.equal(await slow.locator('main > .card').isVisible(), true);
    const [leftPanel, rightPanel] = await Promise.all([
      slow.locator('main > .utilities-sidebar').boundingBox(),
      slow.locator('main > .card').boundingBox()
    ]);
    assert.ok(rightPanel.x >= leftPanel.x + leftPanel.width);
    assert.ok(releaseScript, 'The delayed script request should have started');
    releaseScript();
    await slow.waitForLoadState('domcontentloaded');
    await slow.close();

    await page.addInitScript(() => {
      window.__documentTransitionSeen = false;
      addEventListener('pagereveal', event => {
        if (event.viewTransition) window.__documentTransitionSeen = true;
      });
    });
    await page.goto('http://localhost:8765/tools/shape-mask/');
    const links = page.locator('.utilities-menu a');
    assert.equal(await links.count(), 9);
    assert.equal(await page.locator('.utilities-menu a[href*="basketball"]').count(), 0);
    assert.equal(await page.locator('.utilities-menu a[aria-current="page"]').count(), 1);
    assert.equal(await page.locator('.utilities-menu a[aria-current="page"] .utilities-name').innerText(), 'Shape Mask Converter');
    assert.equal(await page.locator('.utilities-sidebar').isVisible(), true);
    assert.equal(await page.locator('.utilities-toggle').isVisible(), false);
    assert.equal(await page.locator('.utilities-menu img').evaluateAll(
      images => images.every(image => image.complete && image.naturalWidth > 0)
    ), true);
    assert.equal(await page.locator('.utilities-menu a[href="../qr/"] img').getAttribute('src'),
      '../assets/icons/qr-paper.png');
    assert.equal(await page.locator('main > .card').evaluate(
      element => getComputedStyle(element).viewTransitionName
    ), 'utilities-panel');

    await page.locator('.utilities-menu a[href="../qr/"]').click();
    await page.waitForURL('**/tools/qr/');
    assert.equal(await page.locator('.utilities-menu a[aria-current="page"] .utilities-name').innerText(), 'Bulk QR Code Generator');
    assert.equal(await page.locator('#paste').count(), 1);
    // Chromium supports cross-document View Transitions: assert that an
    // actual transition was created, beyond just checking the CSS name.
    if (await page.evaluate(() => typeof document.startViewTransition === 'function')) {
      await page.waitForFunction(() => window.__documentTransitionSeen === true);
    }

    await page.setViewportSize({ width: 375, height: 812 });
    const toggle = page.locator('.utilities-toggle');
    assert.equal(await toggle.isVisible(), true);
    assert.equal(await links.first().isVisible(), false);
    await toggle.click();
    assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
    assert.equal(await links.first().isVisible(), true);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.keyboard.press('Escape');
    assert.equal(await toggle.getAttribute('aria-expanded'), 'false');

    await toggle.click();
    await page.locator('.utilities-menu a[href="../trim/"]').click();
    await page.waitForURL('**/tools/trim/');
    assert.equal(await page.locator('main > .card #drop-area').count(), 1);
    assert.equal(await page.locator('.utilities-menu a[aria-current="page"] .utilities-name').innerText(), 'Trim SVG Contents');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.locator('.utilities-overview').click();
    await page.waitForURL('**/tools/');
    assert.equal(await page.locator('nav[aria-label="Design utilities"] > a').count(), 9);
    assert.equal(await page.locator('main.card').evaluate(
      element => getComputedStyle(element).viewTransitionName
    ), 'utilities-sidebar');

    // The overview retains its illustrated cards and transitions into the shell.
    const overviewIcons = await page.locator('nav[aria-label="Design utilities"] > a .tool-icon')
      .evaluateAll(images => images.map(image => image.getAttribute('src').split('/').pop()));
    await page.locator('nav[aria-label="Design utilities"] > a[href="shape-mask/"]').click();
    await page.waitForURL('**/tools/shape-mask/');
    const sidebarIcons = await page.locator('.utilities-menu a img')
      .evaluateAll(images => images.map(image => image.getAttribute('src').split('/').pop()));
    assert.deepEqual(sidebarIcons, overviewIcons);
    assert.equal(await page.locator('.utilities-sidebar').isVisible(), true);
    // Both the overview card and this utility sidebar must share the name;
    // the right content card must use a different name, so it can enter.
    assert.equal(await page.locator('.utilities-sidebar').evaluate(
      element => getComputedStyle(element).viewTransitionName
    ), 'utilities-sidebar');
    assert.equal(await page.locator('main > .card').evaluate(
      element => getComputedStyle(element).viewTransitionName
    ), 'utilities-panel');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:8765/tools/pdf-inspector/');
    assert.equal(await page.locator('.utilities-sidebar').isVisible(), true);
    assert.equal(await page.locator('#drop-zone').count(), 1);
    assert.equal(await page.evaluate(() =>
      [...document.styleSheets].some(sheet => {
        try {
          return [...sheet.cssRules].some(rule =>
            rule.constructor?.name === 'CSSMediaRule' &&
            rule.conditionText === '(prefers-reduced-motion: reduce)' &&
            [...rule.cssRules].some(nested => nested.cssText.includes('@view-transition'))
          );
        } catch { return false; }
      }
    ), true);
    assert.deepEqual(errors, []);
    console.log('PASS: actual overview/sidebar morph pairing, cross-document transition, icons, responsive navigation and reduced motion');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
