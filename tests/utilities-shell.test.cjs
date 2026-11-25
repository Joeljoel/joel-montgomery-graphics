// Serve the repository at localhost:8765 and run with Playwright.
// Validates the shared sidebar without changing the individual tool logic.
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
    const css = readFileSync(join(__dirname, '../tools/shared/utilities-shell.css'), 'utf8');
    assert.match(css,
      /\.utilities-menu > \.utilities-active-indicator\s*\{\s*z-index:\s*0/,
      'Sliding highlight should be beneath the menu rows');
    assert.doesNotMatch(css, /view-transition-name:\s*utilities-active\s*;/,
      'The highlight must not become an overlay snapshot');
    assert.match(css,
      /html\.utilities-inplace-navigation[^}]+\.utilities-menu > a\s*\{\s*view-transition-name:\s*none/s,
      'Sidebar icons and labels must stay live while the right panel changes');
    assert.match(css,
      /::view-transition-image-pair\(utilities-surface\)\s*\{[^}]*background:\s*#fff[^}]*overflow:\s*clip/s,
      'The surface must paint the interpolated rectangle instead of stretching an image');
    assert.match(css,
      /::view-transition-new\(utilities-surface\)\s*\{[^}]*opacity:\s*0/s,
      'Hide aspect-ratio-dependent surface snapshots');

    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    // Hold the enhancement script back: the sidebar and two-column layout
    // must already be present in the HTML before the script runs.
    const slow = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    let releaseScript;
    await slow.route('**/utilities-shell.js?v=10', async route => {
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
    ), 'utilities-content');

    // Arc/Chromium now uses the same persistent host as Firefox for tab
    // changes: the left sidebar never unmounts and never gets snapshotted.
    await page.evaluate(() => {
      window.__sidebarIdentity = document.querySelector('.utilities-sidebar');
      window.__mainIdentity = document.querySelector('main');
    });
    // Moving the pointer onto a tool warms one isolated candidate without
    // replacing the current panel. The click must reuse the same frame.
    await page.locator('.utilities-menu a[href="../qr/"]').hover();
    await page.waitForFunction(() => {
      const frame = document.querySelector('main > .utilities-frame-slot > iframe');
      return frame?.contentDocument?.documentElement?.classList.contains('utilities-embedded') &&
        frame.contentDocument.readyState === 'complete';
    });
    await page.evaluate(() => {
      window.__warmFrame = document.querySelector('main > .utilities-frame-slot > iframe');
    });
    assert.ok(page.url().endsWith('/tools/shape-mask/'));
    await page.locator('.utilities-menu a[href="../qr/"]').click();
    await page.waitForURL('**/tools/qr/');
    assert.equal(await page.evaluate(() =>
      document.querySelector('main > .utilities-frame-slot > iframe') === window.__warmFrame
    ), true, 'The prepared frame should be reused on click');
    await page.locator('main > .utilities-frame-slot > iframe').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() =>
      document.querySelector('.utilities-sidebar') === window.__sidebarIdentity &&
      document.querySelector('main') === window.__mainIdentity
    ), true, 'The sidebar and its icons must stay mounted');
    assert.equal(await page.locator('.utilities-menu a[aria-current="page"] .utilities-name').innerText(), 'Bulk QR Code Generator');
    assert.equal(await page.frameLocator('main > .utilities-frame-slot > iframe').locator('#paste').count(), 1);
    assert.equal(await page.evaluate(() =>
      getComputedStyle(document.querySelector('.utilities-sidebar')).viewTransitionName
    ), 'none');
    assert.equal(await page.locator('.utilities-menu img').count(), 9);
    const indicatorStack = await page.evaluate(() => {
      const menu = document.querySelector('.utilities-menu');
      const indicator = menu.querySelector('.utilities-active-indicator');
      return {
        name: getComputedStyle(indicator).viewTransitionName,
        rowZ: getComputedStyle(menu.querySelector('a[aria-current="page"]')).zIndex,
        indicatorZ: getComputedStyle(indicator).zIndex
      };
    });
    assert.equal(indicatorStack.name, 'none');
    assert.equal(indicatorStack.rowZ, '1');
    assert.ok(Number(indicatorStack.indicatorZ) < Number(indicatorStack.rowZ));

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
    assert.equal(await page.frameLocator('main > .utilities-frame-slot > iframe').locator('#drop-area').count(), 1);
    assert.equal(await page.evaluate(() =>
      document.querySelector('.utilities-sidebar') === window.__sidebarIdentity
    ), true);
    assert.equal(await page.locator('.utilities-menu a[aria-current="page"] .utilities-name').innerText(), 'Trim SVG Contents');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.locator('.utilities-overview').click();
    await page.waitForURL('**/tools/');
    assert.equal(await page.locator('main.utilities-overview-card > nav > a').count(), 9);
    assert.equal(await page.evaluate(() =>
      document.querySelector('.utilities-sidebar') === window.__sidebarIdentity &&
      document.querySelector('main.utilities-host') === window.__mainIdentity
    ), true, 'Returning to the overview must not replace the top document or sidebar');
    assert.equal(await page.locator('main.card > .utilities-surface').evaluate(
      element => getComputedStyle(element).viewTransitionName
    ), 'utilities-surface');

    // The overview retains its illustrated cards and transitions into the shell.
    const overviewIcons = await page.locator('main.utilities-overview-card > nav > a .tool-icon')
      .evaluateAll(images => images.map(image => image.getAttribute('src').split('/').pop()));
    await page.locator('main.utilities-overview-card > nav > a[href="/tools/shape-mask/"]').click();
    await page.waitForURL('**/tools/shape-mask/');
    const sidebarIcons = await page.locator('.utilities-menu a img')
      .evaluateAll(images => images.map(image => image.getAttribute('src').split('/').pop()));
    assert.deepEqual(sidebarIcons, overviewIcons);
    assert.equal(await page.locator('.utilities-sidebar').isVisible(), true);
    // Both the overview card and this utility sidebar must share the name;
    // the right content card must use a different name, so it can enter.
    assert.equal(await page.locator('.utilities-sidebar > .utilities-surface').evaluate(
      element => getComputedStyle(element).viewTransitionName
    ), 'utilities-surface');
    assert.equal(await page.locator('main > .card').evaluate(
      element => getComputedStyle(element).viewTransitionName
    ), 'utilities-content');

    // The same nine names exist in BOTH grid and sidebar. This is what
    // causes nine spatial moves, rather than one large grid snapshot fade.
    const sidebarNames = await page.locator('.utilities-menu > a').evaluateAll(
      links => links.map(link => getComputedStyle(link).viewTransitionName)
    );
    assert.equal(new Set(sidebarNames).size, 9);
    assert.ok(sidebarNames.every(name => name.startsWith('utilities-tile-')));
    assert.equal(await page.locator('.utilities-frame-slot').count(), 0,
      'Returning to the original tool should reuse its original card');
    await page.locator('.utilities-overview').click();
    await page.waitForURL('**/tools/');
    const overviewNames = await page.locator('main.card > nav[aria-label="Design utilities"] > a')
      .evaluateAll(links => links.map(link => getComputedStyle(link).viewTransitionName));
    assert.deepEqual(overviewNames, sidebarNames);

    // A fresh visit to /tools/ must also keep the same document through
    // forward, reverse, and history navigation. No full-page load is allowed.
    await page.goto('http://localhost:8765/tools/');
    await page.locator('main.utilities-overview-card').waitFor({ state: 'visible' });
    await page.evaluate(() => {
      window.__overviewIdentity = document.querySelector('main.utilities-overview-card');
      window.__sidebarIdentity = document.querySelector('.utilities-sidebar');
      window.__rootIdentity = document.documentElement;
    });
    let documentRequests = 0;
    const countDocumentRequest = request => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documentRequests++;
    };
    page.on('request', countDocumentRequest);
    await page.locator('main.utilities-overview-card > nav > a[href="qr/"]').click();
    await page.waitForURL('**/tools/qr/');
    await page.locator('main.utilities-host > .utilities-frame-slot > iframe').waitFor({ state: 'visible' });
    assert.equal(await page.frameLocator('main.utilities-host > .utilities-frame-slot > iframe').locator('.card h1').innerText(), 'Bulk QR Code Generator');
    const sameDocument = () => page.evaluate(() =>
      document.documentElement === window.__rootIdentity &&
      document.querySelector('main.utilities-overview-card') === window.__overviewIdentity &&
      document.querySelector('.utilities-sidebar') === window.__sidebarIdentity
    );
    assert.equal(await sameDocument(), true);
    await page.locator('.utilities-overview').click();
    await page.waitForURL('**/tools/');
    assert.equal(await sameDocument(), true);
    assert.equal(await page.locator('main.utilities-overview-card').isVisible(), true);
    assert.equal(await page.locator('.utilities-sidebar').isVisible(), false);
    await page.goBack();
    await page.waitForURL('**/tools/qr/');
    assert.equal(await sameDocument(), true);
    await page.goForward();
    await page.waitForURL('**/tools/');
    assert.equal(await sameDocument(), true);
    assert.equal(documentRequests, 0, 'No overview transition may reload the main document');
    page.off('request', countDocumentRequest);

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
      })
    ), true);
    // A sidebar-loaded native dialog must cover the sidebar as well as the tool.
    await page.locator('.utilities-menu a[href="../stretch-repeat/"]').click();
    await page.waitForURL('**/tools/stretch-repeat/');
    const slot = page.locator('.utilities-frame-slot:not([aria-hidden])');
    const tutorial = slot.frameLocator('iframe').locator('#how-to-open');
    await tutorial.click();
    await page.waitForSelector('.utilities-frame-modal');
    const { width, height } = page.viewportSize();
    assert.deepEqual(await slot.locator('iframe').boundingBox(), { x: 0, y: 0, width, height });
    assert.equal(await page.locator('.utilities-sidebar').evaluate(el => el.inert), true);
    await page.keyboard.press('Escape');
    await page.waitForSelector('.utilities-frame-modal', { state: 'detached' });
    assert.equal(await tutorial.evaluate(el => el === document.activeElement), true);
    assert.equal(await page.locator('.utilities-sidebar').evaluate(el => el.inert), false);
    assert.deepEqual(errors, []);
    console.log('PASS: persistent overview and sidebar, zero main-document requests, history, preloading and reduced motion');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
