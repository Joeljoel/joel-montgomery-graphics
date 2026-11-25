// Persistent navigation for the design utilities. The overview and sidebar
// morph within the same document; standalone tool URLs still load directly.
(() => {
  'use strict';

  // This document is being loaded as an isolated tool panel. Its own sidebar
  // is hidden by CSS; only the top-level document owns navigation.
  if (document.documentElement.classList.contains('utilities-embedded')) return;

  // Both layouts live in this document. Direct visits still load the
  // standalone HTML route; internal navigation never reloads the document.
  const overviewPath = '/tools/';
  const initialPath = location.pathname;
  const initialTitle = document.title;
  const enteredFromOverview = !document.body.classList.contains('utilities-shell');
  const initialOverview = enteredFromOverview ? document.querySelector('body > main.card') : null;
  let overview = initialOverview;
  let overviewTimer = null;
  function stopBonus() {
    clearTimeout(overviewTimer);
    overviewTimer = null;
  }
  function startBonus() {
    stopBonus();
    if (!overview || overview.querySelector('.secret-reveal')) return;
    overviewTimer = window.setTimeout(() => {
      if (overview.hidden) return;
      const link = document.createElement('a');
      link.href = '/basketball/';
      link.innerHTML = '<img class="tool-icon" src="/tools/assets/icons/basketball-paper.png" alt="" width="72" height="72"><span class="tool-copy"><span class="tool-name">Secret<br>Basketball Game</span><span class="tool-subtitle">Hoops of Fun</span></span><span class="chevron" aria-hidden="true"></span>';
      const reveal = document.createElement('div');
      reveal.className = 'secret-reveal';
      reveal.append(link);
      const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (animate) {
        reveal.style.height = '0px';
        reveal.style.overflow = 'hidden';
      }
      overview.querySelector('nav[aria-label="Design utilities"]').append(reveal);

      if (animate) {
        const previous = reveal.previousElementSibling.getBoundingClientRect();
        const sameRow = Math.abs(previous.top - reveal.getBoundingClientRect().top) < 1;
        const height = Math.max(link.getBoundingClientRect().height, sameRow ? previous.height : 0);
        const expand = reveal.animate(
          [{ height: '0px' }, { height: height + 'px' }],
          { duration: 600, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' }
        );
        link.animate(
          [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'translateY(0)' }],
          { duration: 450, delay: 120, easing: 'ease-out', fill: 'backwards' }
        );
        expand.onfinish = () => {
          reveal.style.removeProperty('height');
          reveal.style.removeProperty('overflow');
          expand.cancel();
        };
      }
    }, 10000);
  }
  if (!document.startViewTransition) {
    if (initialOverview) startBonus();
    const fallbackSidebar = document.querySelector('.utilities-sidebar');
    const toggle = fallbackSidebar?.querySelector('.utilities-toggle');
    toggle?.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', String(fallbackSidebar.classList.toggle('is-open')));
    });
    return;
  }
  // Relative assets and the original tool's scripts retain their original
  // base URL even when the visible route changes using pushState.
  if (!document.querySelector('base')) {
    const base = document.createElement('base');
    base.href = location.href;
    document.head.prepend(base);
  }
  const makeElement = html => {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  };
  let main = enteredFromOverview ? null : document.querySelector('body.utilities-shell > main');
  if (enteredFromOverview) {
    main = document.createElement('main');
    main.className = 'container utilities-host';
    main.hidden = true;
    main.inert = true;
    main.append(makeElement("<aside class=\"utilities-sidebar\" aria-label=\"Design utilities\">\n      <span class=\"utilities-surface\" aria-hidden=\"true\"></span>\n      <a class=\"utilities-home\" href=\"/tools/\" aria-label=\"All design utilities\"><img src=\"/tools/assets/easilLogo.png\" alt=\"\" width=\"30\" height=\"30\"><span>Design Utilities</span></a>\n      <button class=\"utilities-toggle\" type=\"button\" aria-controls=\"utilities-navigation\" aria-expanded=\"false\" aria-label=\"Browse utilities. Current: Shape Mask Converter\">\n        <img src=\"/tools/assets/icons/shape-mask-paper.png\" alt=\"\" width=\"42\" height=\"42\">\n        <span class=\"utilities-toggle-copy\"><small>Current utility</small><strong>Shape Mask Converter</strong></span>\n        <span class=\"utilities-toggle-chevron\" aria-hidden=\"true\"></span>\n      </button>\n      <nav id=\"utilities-navigation\" class=\"utilities-menu\" aria-label=\"Choose a design utility\">\n        <a href=\"/tools/shape-mask/\" aria-current=\"page\"><span class=\"utilities-active-indicator\" aria-hidden=\"true\"></span><img src=\"/tools/assets/icons/shape-mask-paper.png\" alt=\"\" width=\"42\" height=\"42\"><span class=\"utilities-name\">Shape Mask Converter</span></a>\n        <a href=\"/tools/stretch-repeat/\"><img src=\"/tools/assets/icons/stretch-repeat-paper-v2.png\" alt=\"\" width=\"42\" height=\"42\"><span class=\"utilities-name\">Stretch &amp; Repeat Converter</span></a>\n        <a href=\"/tools/repeat/\"><img src=\"/tools/assets/icons/repeat-paper-v2.png\" alt=\"\" width=\"42\" height=\"42\"><span class=\"utilities-name\">Repeating Shape Converter</span></a>\n        <a href=\"/tools/stretchable/\"><img src=\"/tools/assets/icons/stretchable-paper.png\" alt=\"\" width=\"42\" height=\"42\"><span class=\"utilities-name\">Stretchable Shape Converter</span></a>\n        <a href=\"/tools/trim/\"><img src=\"/tools/assets/icons/trim-plastic.png\" alt=\"\" width=\"42\" height=\"42\"><span class=\"utilities-name\">Trim SVG Contents</span></a>\n        <a href=\"/tools/barcode/\"><img src=\"/tools/assets/icons/barcode-paper.png\" alt=\"\" width=\"42\" height=\"42\"><span class=\"utilities-name\">Barcode Data Merge</span></a>\n        <a href=\"/tools/qr/\"><img src=\"/tools/assets/icons/qr-paper.png\" alt=\"\" width=\"42\" height=\"42\"><span class=\"utilities-name\">Bulk QR Code Generator</span></a>\n        <a href=\"/tools/image-grid/\"><img src=\"/tools/assets/icons/image-grid-paper.png\" alt=\"\" width=\"42\" height=\"42\"><span class=\"utilities-name\">Image Reference Grid</span></a>\n        <a href=\"/tools/pdf-inspector/\"><img src=\"/tools/assets/icons/pdf-inspector-paper.png\" alt=\"\" width=\"42\" height=\"42\"><span class=\"utilities-name\">PDF Inspector</span></a>\n      </nav>\n      <a class=\"utilities-overview\" href=\"/tools/\">← All utilities</a>\n    </aside>"));
    document.body.append(main);
    document.body.classList.add('utilities-overview-origin');
  } else {
    main.classList.add('utilities-host');
    overview = makeElement("<main class=\"card\">\n    <span class=\"utilities-surface\" aria-hidden=\"true\"></span>\n    <header><img src=\"/tools/assets/easilLogo.png\" alt=\"\" width=\"24\" height=\"24\"><h1>Design Utilities</h1></header>\n    <nav aria-label=\"Design utilities\">\n      <a href=\"/tools/shape-mask/\"><img class=\"tool-icon\" src=\"/tools/assets/icons/shape-mask-paper.png\" alt=\"\" width=\"72\" height=\"72\"><span class=\"tool-copy\"><span class=\"tool-name\">Shape Mask<br>Converter</span><span class=\"tool-subtitle\">Create image masks from vector shapes</span></span><span class=\"chevron\" aria-hidden=\"true\"></span></a>\n      <a href=\"/tools/stretch-repeat/\"><img class=\"tool-icon\" src=\"/tools/assets/icons/stretch-repeat-paper-v2.png\" alt=\"\" width=\"72\" height=\"72\"><span class=\"tool-copy\"><span class=\"tool-name\">Stretch &amp; Repeat<br>Converter</span><span class=\"tool-subtitle\">Repeat a centre section with fixed endcaps</span></span><span class=\"chevron\" aria-hidden=\"true\"></span></a>\n      <a href=\"/tools/repeat/\"><img class=\"tool-icon\" src=\"/tools/assets/icons/repeat-paper-v2.png\" alt=\"\" width=\"72\" height=\"72\"><span class=\"tool-copy\"><span class=\"tool-name\">Repeating<br>Shape Converter</span><span class=\"tool-subtitle\">Turn artwork into a horizontal repeat</span></span><span class=\"chevron\" aria-hidden=\"true\"></span></a>\n      <a href=\"/tools/stretchable/\"><img class=\"tool-icon\" src=\"/tools/assets/icons/stretchable-paper.png\" alt=\"\" width=\"72\" height=\"72\"><span class=\"tool-copy\"><span class=\"tool-name\">Stretchable<br>Shape Converter</span><span class=\"tool-subtitle\">Stretch artwork horizontally, vertically or both</span></span><span class=\"chevron\" aria-hidden=\"true\"></span></a>\n      <a href=\"/tools/trim/\"><img class=\"tool-icon\" src=\"/tools/assets/icons/trim-plastic.png\" alt=\"\" width=\"72\" height=\"72\"><span class=\"tool-copy\"><span class=\"tool-name\">Trim SVG<br>Contents</span><span class=\"tool-subtitle\">Trim empty space from SVG files in bulk</span></span><span class=\"chevron\" aria-hidden=\"true\"></span></a>\n      <a href=\"/tools/barcode/\"><img class=\"tool-icon\" src=\"/tools/assets/icons/barcode-paper.png\" alt=\"\" width=\"72\" height=\"72\"><span class=\"tool-copy\"><span class=\"tool-name\">Barcode<br>Data Merge</span><span class=\"tool-subtitle\">Prepare barcode data for InDesign</span></span><span class=\"chevron\" aria-hidden=\"true\"></span></a>\n      <a href=\"/tools/qr/\"><img class=\"tool-icon\" src=\"/tools/assets/icons/qr-paper.png\" alt=\"\" width=\"72\" height=\"72\"><span class=\"tool-copy\"><span class=\"tool-name\">Bulk QR Code<br>Generator</span><span class=\"tool-subtitle\">Create QR codes from lists and spreadsheets</span></span><span class=\"chevron\" aria-hidden=\"true\"></span></a>\n      <a href=\"/tools/image-grid/\"><img class=\"tool-icon\" src=\"/tools/assets/icons/image-grid-paper.png\" alt=\"\" width=\"72\" height=\"72\"><span class=\"tool-copy\"><span class=\"tool-name\">Image Reference<br>Grid</span><span class=\"tool-subtitle\">Arrange images for screenshots</span></span><span class=\"chevron\" aria-hidden=\"true\"></span></a>\n      <a href=\"/tools/pdf-inspector/\"><img class=\"tool-icon\" src=\"/tools/assets/icons/pdf-inspector-paper.png\" alt=\"\" width=\"72\" height=\"72\"><span class=\"tool-copy\"><span class=\"tool-name\">PDF<br>Inspector</span><span class=\"tool-subtitle\">Check finished size, crop and bleed</span></span><span class=\"chevron\" aria-hidden=\"true\"></span></a>\n    </nav>\n  </main>");
    overview.hidden = true;
    overview.inert = true;
    document.body.append(overview);
  }
  overview.classList.add('utilities-overview-card');
  if (enteredFromOverview) startBonus();

  const sidebar = main.querySelector('.utilities-sidebar');
  const toggle = sidebar.querySelector('.utilities-toggle');
  const setOpen = open => {
    sidebar.classList.toggle('is-open', open);
    toggle?.setAttribute('aria-expanded', String(open));
  };
  toggle?.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
  sidebar.addEventListener('keydown', event => {
    if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
      setOpen(false);
      toggle?.focus();
    }
  });
  const initialCard = main.querySelector(':scope > .card');
  const initialInfo = main.querySelector(':scope > .info');
  const toolPaths = new Set([...sidebar.querySelectorAll('.utilities-menu > a')]
    .map(link => new URL(link.href).pathname));
  document.documentElement.classList.remove('utilities-fallback-enter', 'utilities-fallback-exiting');

  const original = { card: initialCard, info: initialInfo };
  let cleanupFrame = null;
  let requestId = 0;
  let transitionId = 0;
  let selectionMotion = null;
  let candidate = null;
  let warmTimer = null;
  let pendingPath = null;
  let activePath = enteredFromOverview ? null : initialPath;
  let activeTitle = enteredFromOverview ? null : initialTitle;
  let activePanel = initialCard ? 'original' : null;
  let activeTransition = null;

  // The highlight must be a real element BELOW every icon and label.
  // A View Transition snapshot is drawn in a topmost overlay and cannot
  // sit behind live sidebar contents, regardless of its CSS z-index.
  const menu = sidebar.querySelector('.utilities-menu');
  function settleSelection() {
    const indicator = menu.querySelector('.utilities-active-indicator');
    selectionMotion?.cancel();
    selectionMotion = null;
    if (!indicator) return;
    indicator.removeAttribute('style');
    const selected = menu.querySelector('a[aria-current="page"]');
    if (selected && indicator.parentElement !== selected) selected.prepend(indicator);
  }
  function prepareForNavigationAway() {
    settleSelection();
    // The overview transition needs all nine tile names restored before
    // the outgoing capture, even if the user navigates mid-panel-swap.
    document.documentElement.classList.remove('utilities-inplace-navigation');
    stopBonus();
    cancelWarmTimer();
    discardCandidate();
    clearPending();
    ++requestId;
  }
  window.addEventListener('pageswap', prepareForNavigationAway);
  window.addEventListener('pagehide', prepareForNavigationAway);
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    prepareForNavigationAway();
    if (!overview.hidden) startBonus();
  });

  const visiblePanel = () =>
    main.querySelector(':scope > .card, :scope > .utilities-frame-slot');

  function updateSelection(path, animate = true) {
    const items = sidebar.querySelectorAll('.utilities-menu > a');
    const current = sidebar.querySelector('.utilities-menu > a[aria-current="page"]');
    const next = [...items].find(a => new URL(a.href).pathname === path);
    if (!next) return;
    current?.removeAttribute('aria-current');
    next.setAttribute('aria-current', 'page');

    // Animate the blue background using its actual DOM box. During the
    // motion it is a direct child of the menu, underneath ALL nine rows.
    // Reattach it to the selected row after the animation for the overview
    // morph's tile capture.
    let indicator = menu.querySelector('.utilities-active-indicator');
    const from = indicator?.getBoundingClientRect();
    selectionMotion?.cancel();
    selectionMotion = null;
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'utilities-active-indicator';
      indicator.setAttribute('aria-hidden', 'true');
    }
    indicator.removeAttribute('style');
    next.prepend(indicator);
    const to = next.getBoundingClientRect();
    if (animate && from?.width && from.height && to.width && to.height &&
        !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const bounds = menu.getBoundingClientRect();
      menu.append(indicator);
      Object.assign(indicator.style, {
        inset: 'auto',
        top: (to.top - bounds.top + menu.scrollTop) + 'px',
        left: (to.left - bounds.left + menu.scrollLeft) + 'px',
        width: to.width + 'px',
        height: to.height + 'px'
      });
      const dx = from.left - to.left, dy = from.top - to.top;
      const animation = indicator.animate([
        { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' +
            (from.width / to.width) + ',' + (from.height / to.height) + ')' },
        { transform: 'translate(0,0) scale(1,1)' }
      ], { duration: 220, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
      selectionMotion = animation;
      animation.onfinish = () => {
        if (selectionMotion !== animation) return;
        selectionMotion = null;
        animation.cancel();
        indicator.removeAttribute('style');
        next.prepend(indicator);
      };
    }

    const title = next.querySelector('.utilities-name')?.textContent || '';
    const toggleIcon = sidebar.querySelector('.utilities-toggle > img');
    const icon = next.querySelector('img');
    if (toggleIcon && icon) toggleIcon.src = icon.src;
    const toggleLabel = sidebar.querySelector('.utilities-toggle-copy strong');
    if (toggleLabel) toggleLabel.textContent = title;
    if (toggle) toggle.setAttribute('aria-label', 'Browse utilities. Current: ' + title);
  }

  function runTransition(change, inplace) {
    const id = ++transitionId;
    const root = document.documentElement;
    activeTransition?.skipTransition();
    root.classList.toggle('utilities-inplace-navigation', inplace);
    const cleanup = () => {
      if (id === transitionId) {
        root.classList.remove('utilities-inplace-navigation');
        activeTransition = null;
      }
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      change();
      cleanup();
      return;
    }
    const transition = document.startViewTransition(change);
    activeTransition = transition;
    transition.finished.then(cleanup, cleanup);
  }

  function recordLocation(path, title, push) {
    document.title = title;
    if (push && location.pathname !== path) history.pushState({ utilitiesPanel: true }, '', path);
  }

  function swapPanel(target, path, title, push) {
    const request = requestId;
    const fromOverview = !overview.hidden;
    settleSelection();
    runTransition(() => {
      if (request !== requestId) {
        if (target !== 'original' && target !== activePanel) target.remove();
        return;
      }
      stopBonus();
      overview.hidden = true;
      overview.inert = true;
      main.hidden = false;
      main.inert = false;
      document.body.classList.add('utilities-shell');
      main.querySelector(':scope > .card')?.remove();
      main.querySelector(':scope > .info')?.remove();
      main.querySelectorAll(':scope > .utilities-frame-slot').forEach(slot => {
        if (slot !== target && slot !== candidate?.slot) slot.remove();
      });
      if (target === 'original') {
        sidebar.after(original.card);
        if (original.info) original.card.after(original.info);
      } else {
        target.removeAttribute('aria-hidden');
        target.inert = false;
        for (const prop of ['position', 'left', 'top', 'visibility', 'width', 'view-transition-name']) {
          target.style.removeProperty(prop);
        }
        // The loaded frame must not be reparented: doing so reloads it.
        const frame = target.querySelector('iframe');
        if (frame) resizeFrame(frame);
      }
      updateSelection(path, !fromOverview);
      clearPending();
      activePath = path;
      activePanel = target;
      activeTitle = title;
      recordLocation(path, title, push);
      if (fromOverview) window.scrollTo(0, 0);
    }, !fromOverview);
  }

  function showOverview(push) {
    const request = ++requestId;
    cancelWarmTimer();
    discardCandidate();
    clearPending();
    if (!overview.hidden) {
      recordLocation(overviewPath, 'Design Utilities', push);
      return;
    }
    settleSelection();
    runTransition(() => {
      if (request !== requestId) return;
      main.hidden = true;
      main.inert = true;
      overview.hidden = false;
      overview.inert = false;
      document.body.classList.remove('utilities-shell');
      setOpen(false);
      overview.querySelector('.secret-reveal')?.remove();
      recordLocation(overviewPath, 'Design Utilities', push);
      window.scrollTo(0, 0);
      startBonus();
    }, false);
  }

  function resizeFrame(frame) {
    if (!frame.isConnected) return;
    const doc = frame.contentDocument;
    if (!doc?.body) return;
    const innerMain = doc.querySelector('body > main');
    const mainHeight = innerMain ? innerMain.getBoundingClientRect().height : 0;
    frame.style.height = Math.ceil(Math.max(120, mainHeight)) + 'px';
  }

  function activateFrame(frame, slot, path, push) {
    const doc = frame.contentDocument;
    if (!doc || !doc.documentElement.classList.contains('utilities-embedded') ||
      !doc.querySelector('main > .card')) {
      // If the nested page failed to load normally, use ordinary navigation.
      location.assign(path);
      return;
    }

    if (cleanupFrame) { cleanupFrame(); cleanupFrame = null; }
    const root = doc.documentElement;
    function syncFrame() {
      if (main.hidden) return;
      const modal = !!doc.querySelector('dialog:modal');
      if (modal && !slot.classList.contains('utilities-frame-modal')) {
        slot.style.setProperty('--panel-height', frame.offsetHeight + 'px');
      }
      slot.classList.toggle('utilities-frame-modal', modal);
      root.classList.toggle('utilities-embedded-modal', modal);
      sidebar.inert = modal;
      if (modal) {
        const bounds = slot.getBoundingClientRect();
        root.style.setProperty('--panel-left', bounds.left + 'px');
        root.style.setProperty('--panel-top', bounds.top + 'px');
        root.style.setProperty('--panel-width', bounds.width + 'px');
      } else {
        resizeFrame(frame);
      }
    }
    const observer = new ResizeObserver(syncFrame);
    observer.observe(doc.body);
    const modalObserver = new MutationObserver(syncFrame);
    modalObserver.observe(doc.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    window.addEventListener('resize', syncFrame);
    cleanupFrame = () => {
      observer.disconnect();
      modalObserver.disconnect();
      window.removeEventListener('resize', syncFrame);
      sidebar.inert = false;
    };

    const title = doc.title || 'Design Utilities';
    swapPanel(slot, path, title, push);
    syncFrame();
  }

  function cancelWarmTimer() {
    clearTimeout(warmTimer);
    warmTimer = null;
  }

  function clearPending() {
    pendingPath = null;
    document.querySelectorAll('[data-utilities-pending]').forEach(link =>
      link.removeAttribute('data-utilities-pending'));
  }

  function showPending(path) {
    clearPending();
    pendingPath = path;
    const nav = overview.hidden ? menu : overview.querySelector('nav');
    [...nav.querySelectorAll('a[href]')].find(link =>
      new URL(link.href).pathname === path)?.setAttribute('data-utilities-pending', '');
  }

  function discardCandidate() {
    if (!candidate) return;
    candidate.slot.remove();
    candidate = null;
  }

  // Keep at most one off-screen, ready-to-use tool. A brief hover or keyboard
  // focus predicts intent; a normal click can reuse the exact loaded frame.
  // This does not navigate the host or change the selected tool until clicked.
  function createCandidate(path) {
    const slot = document.createElement('div');
    slot.className = 'utilities-frame-slot';
    slot.setAttribute('aria-hidden', 'true');
    slot.inert = true;
    // Load at the exact panel width without shifting the current page.
    const viewport = document.documentElement.clientWidth;
    const estimatedWidth = viewport > 960
      ? Math.min(1290, viewport) - 320
      : Math.min(900, viewport) - (viewport <= 620 ? 24 : 32);
    const panelWidth = (!main.hidden && visiblePanel()?.getBoundingClientRect().width) || estimatedWidth;
    slot.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;' +
      'width:' + Math.max(200, panelWidth) + 'px;view-transition-name:none;';

    const frame = document.createElement('iframe');
    frame.className = 'utilities-frame';
    frame.title = 'Design utility';
    frame.setAttribute('loading', 'eager');
    const url = new URL(path, location.origin);
    url.searchParams.set('utilitiesFrame', '1');
    const ready = new Promise(resolve => {
      frame.addEventListener('load', () => resolve(true), { once: true });
      frame.addEventListener('error', () => resolve(false), { once: true });
    });
    frame.src = url.href;
    slot.append(frame);
    main.append(slot);
    return { path, slot, frame, ready };
  }

  function warmTool(event) {
    if (event.pointerType === 'touch' || navigator.connection?.saveData) return;
    const link = event.target.closest?.('.utilities-menu > a[href], main.utilities-overview-card > nav > a[href]');
    if (!link || pendingPath || (event.type === 'pointerover' && link.contains(event.relatedTarget))) return;
    const path = new URL(link.href).pathname;
    cancelWarmTimer();
    if (!toolPaths.has(path) || path === activePath ||
        (original.card && path === initialPath) || candidate?.path === path) return;
    warmTimer = setTimeout(() => {
      if (pendingPath || path === activePath) return;
      discardCandidate();
      candidate = createCandidate(path);
    }, 100);
  }
  for (const region of [sidebar, overview]) {
    region.addEventListener('pointerover', warmTool);
    region.addEventListener('pointerleave', cancelWarmTimer);
    region.addEventListener('focusin', warmTool);
    region.addEventListener('focusout', cancelWarmTimer);
  }

  function navigate(path, push) {
    if (path === overviewPath) {
      showOverview(push);
      return true;
    }
    if (!toolPaths.has(path)) return false;
    const id = ++requestId;
    cancelWarmTimer();
    showPending(path);
    if (path === activePath && activePanel) {
      discardCandidate();
      if (!overview.hidden) swapPanel(activePanel, path, activeTitle, push);
      else {
        clearPending();
        recordLocation(path, activeTitle, push);
      }
      return true;
    }
    if (original.card && path === initialPath) {
      discardCandidate();
      if (cleanupFrame) { cleanupFrame(); cleanupFrame = null; }
      swapPanel('original', path, initialTitle, push);
      return true;
    }

    if (candidate?.path !== path) {
      discardCandidate();
      candidate = createCandidate(path);
    }
    const next = candidate;
    next.ready.then(loaded => {
      if (id !== requestId || candidate !== next) return;
      if (!loaded) {
        discardCandidate();
        clearPending();
        location.assign(path);
        return;
      }
      candidate = null;
      next.slot.removeAttribute('aria-hidden');
      next.slot.inert = false;
      activateFrame(next.frame, next.slot, path, push);
    });
    return true;
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self') ||
        !(link.closest('.utilities-sidebar') || link.closest('main.utilities-overview-card > nav'))) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin ||
        !(toolPaths.has(url.pathname) || url.pathname === overviewPath)) return;
    event.preventDefault();
    navigate(url.pathname, true);
  });

  window.addEventListener('popstate', () => {
    const modalFrame = main.querySelector('.utilities-frame-modal > iframe');
    (modalFrame?.contentDocument || document).querySelector('dialog:modal')?.close();
    if (!navigate(location.pathname, false)) location.reload();
  });
})();
