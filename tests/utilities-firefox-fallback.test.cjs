// Firefox-style fallback regression: the sidebar stays in the same document.
// Serve repo root at localhost:8765 and run with Playwright.
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH,
    args: ['--no-sandbox']
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    // Chromium can exercise Firefox's same-document fallback by hiding the
    // cross-document-specific CSS interface while retaining startViewTransition.
    await context.addInitScript(() => {
      try {
        Object.defineProperty(window, 'CSSViewTransitionRule',
          { configurable: true, value: undefined });
      } catch {}
    });
    const page = await context.newPage();
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    await page.goto('http://localhost:8765/tools/shape-mask/');
    const canTest = await page.evaluate(() =>
      typeof document.startViewTransition === 'function' &&
      typeof CSSViewTransitionRule === 'undefined'
    );
    assert.ok(canTest, 'Test browser must support same-document View Transitions');

    await page.evaluate(() => {
      window.__sidebarIdentity = document.querySelector('.utilities-sidebar');
      window.__firstMain = document.querySelector('main');
    });
    await page.locator('.utilities-menu a[href="../qr/"]').click();
    await page.waitForURL('**/tools/qr/');
    const iframe = page.locator('main > .utilities-frame-slot > iframe');
    await iframe.waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() =>
      document.querySelector('.utilities-sidebar') === window.__sidebarIdentity
      && document.querySelector('main') === window.__firstMain
    ), true, 'Sidebar and host main must never unmount');
    assert.equal(await page.locator('.utilities-sidebar .utilities-menu img').count(), 9);
    assert.equal(await page.locator('.utilities-menu a[aria-current="page"] .utilities-name').innerText(),
      'Bulk QR Code Generator');
    assert.equal(await iframe.evaluate(frame =>
      frame.contentDocument.documentElement.classList.contains('utilities-embedded')
    ), true);
    assert.equal(await iframe.evaluate(frame =>
      getComputedStyle(frame.contentDocument.querySelector('.utilities-sidebar')).display
    ), 'none');
    assert.equal(await iframe.contentFrame().then(frame =>
      frame.locator('.card h1').innerText()
    ), 'Bulk QR Code Generator');

    // Go back to the original utility without a page reload.
    await page.goBack();
    await page.waitForURL('**/tools/shape-mask/');
    assert.equal(await page.evaluate(() =>
      document.querySelector('.utilities-sidebar') === window.__sidebarIdentity
    ), true);
    assert.equal(await page.locator('main > .card h1').innerText(), 'Shape Mask Converter');

    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator('.utilities-toggle').click();
    await page.locator('.utilities-menu a[href="../trim/"]').click();
    await page.waitForURL('**/tools/trim/');
    assert.equal(await page.locator('main > .utilities-frame-slot iframe').count(), 1);
    assert.equal(await page.evaluate(() =>
      document.querySelector('.utilities-sidebar') === window.__sidebarIdentity
    ), true);
    assert.equal(await page.evaluate(() =>
      document.documentElement.scrollWidth <= window.innerWidth
    ), true, 'The embedded panel must not create horizontal overflow');
    assert.deepEqual(failures, []);
    console.log('PASS: Firefox fallback retains sidebar, isolates tools, handles history and mobile');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
