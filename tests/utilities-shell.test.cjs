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
    ), 'utilities-panel');

    // The overview retains its illustrated cards and transitions into the shell.
    const overviewIcons = await page.locator('nav[aria-label="Design utilities"] > a .tool-icon')
      .evaluateAll(images => images.map(image => image.getAttribute('src').split('/').pop()));
    await page.locator('nav[aria-label="Design utilities"] > a[href="shape-mask/"]').click();
    await page.waitForURL('**/tools/shape-mask/');
    const sidebarIcons = await page.locator('.utilities-menu a img')
      .evaluateAll(images => images.map(image => image.getAttribute('src').split('/').pop()));
    assert.deepEqual(sidebarIcons, overviewIcons);
    assert.equal(await page.locator('.utilities-sidebar').isVisible(), true);

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:8765/tools/pdf-inspector/');
    assert.equal(await page.locator('.utilities-sidebar').isVisible(), true);
    assert.equal(await page.locator('#drop-zone').count(), 1);
    assert.deepEqual(errors, []);
    console.log('PASS: nine matching overview icons, desktop/mobile navigation, overview transition and reduced-motion fallback');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
