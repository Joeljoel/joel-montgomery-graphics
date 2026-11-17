// Shared utility navigation. Each tool remains a standalone HTML document.
// Keep the live navigation DOM mounted when switching between utilities in
// all browsers with same-document transitions. Only the right-hand tool is
// replaced in an isolated frame; /tools/ still uses native cross-document
// transitions in Chromium/Safari. Each tool retains its own JS lifecycle.
(() => {
  'use strict';

  // This document is being loaded as an isolated tool panel. Its own sidebar
  // is hidden by CSS; only the top-level document owns navigation.
  if (document.documentElement.classList.contains('utilities-embedded')) return;

  const sidebar = document.querySelector('.utilities-sidebar');
  const toggle = sidebar?.querySelector('.utilities-toggle');

  if (toggle) {
    const setOpen = open => {
      sidebar.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    };
    toggle.addEventListener('click', () => setOpen(!sidebar.classList.contains('is-open')));
    sidebar.addEventListener('keydown', event => {
      if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  // The overview has no sidebar, so Arc/Chromium/Safari continue to use
  // native grid-to-sidebar cross-document transitions there. Once inside a
  // utility, keep the real sidebar alive and transition its content in-place.
  // Firefox also uses the in-place path because MPA transitions are absent.
  const isFirefox = /Firefox\/\d+/i.test(navigator.userAgent);
  if (!isFirefox) document.documentElement.classList.remove('utilities-fallback-enter');

  const main = document.querySelector('body.utilities-shell > main');
  const initialCard = main?.querySelector(':scope > .card');
  const initialInfo = main?.querySelector(':scope > .info');
  const initialPath = location.pathname;
  const initialTitle = document.title;
  const toolPaths = new Set([...sidebar?.querySelectorAll('.utilities-menu > a') || []]
    .map(link => new URL(link.href).pathname));

  // Older browsers without same-document View Transitions use normal links.
  // Firefox's overview still has the small fade fallback; Arc/Chromium/Safari
  // always keep the native overview morph rather than intercepting it.
  if (!sidebar || !main || !initialCard || !document.startViewTransition) {
    if (!isFirefox) return;
    let leaving = false;
    document.addEventListener('click', event => {
      if (leaving || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const link = event.target.closest?.('a[href]');
      if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self') ||
        !link.closest('.utilities-sidebar, main.card > nav[aria-label="Design utilities"]')) return;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin ||
        !url.pathname.startsWith('/tools/') ||
        url.pathname === location.pathname) return;
      event.preventDefault();
      leaving = true;
      try { sessionStorage.setItem('jm-utilities-next-page', url.pathname); } catch {}
      document.documentElement.classList.add('utilities-fallback-exiting');
      window.setTimeout(() => location.assign(url.href), 155);
    });
    return;
  }

  const original = { card: initialCard, info: initialInfo };
  let cleanupFrame = null;
  let requestId = 0;
  let transitionId = 0;
  let selectionMotion = null;

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
  }
  window.addEventListener('pageswap', prepareForNavigationAway);
  window.addEventListener('pagehide', prepareForNavigationAway);
  window.addEventListener('pageshow', prepareForNavigationAway);

  const visiblePanel = () =>
    main.querySelector(':scope > .card, :scope > .utilities-frame-slot');

  function updateSelection(path) {
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
    if (from?.width && from.height && to.width && to.height &&
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
      ], { duration: 340, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'both' });
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

  function swapPanel(target, path, title, push) {
    const doSwap = () => {
      main.querySelector(':scope > .card')?.remove();
      main.querySelector(':scope > .info')?.remove();
      main.querySelectorAll(':scope > .utilities-frame-slot').forEach(slot => {
        if (slot !== target) slot.remove();
      });

      if (target === 'original') {
        sidebar.after(original.card);
        if (original.info) original.card.after(original.info);
      } else {
        target.style.removeProperty('position');
        target.style.removeProperty('left');
        target.style.removeProperty('top');
        target.style.removeProperty('visibility');
        target.style.removeProperty('width');
        target.style.removeProperty('view-transition-name');
        // Already connected to main; moving an iframe in the DOM would
        // reload it and briefly blank the right panel.
        // Grid placement puts the slot in the correct column without a move.
      }
      updateSelection(path);
      document.title = title;
      if (push) history.pushState({ utilitiesPanel: true }, '', path);
    };

    // Suppress ALL sidebar snapshots, including the active indicator.
    // Only the right panel is captured. The selection animation is a live
    // DOM animation, so it cannot obscure the icons or labels.
    const id = ++transitionId;
    const root = document.documentElement;
    root.classList.add('utilities-inplace-navigation');
    const cleanup = () => {
      if (id === transitionId) root.classList.remove('utilities-inplace-navigation');
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      doSwap();
      cleanup();
      return;
    }

    const transition = document.startViewTransition(doSwap);
    transition.finished.then(cleanup, cleanup);
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
    const resize = () => {
      if (!frame.isConnected) return;
      const innerMain = doc.querySelector('body > main');
      const mainHeight = innerMain ? innerMain.getBoundingClientRect().height : 0;
      const bodyHeight = doc.body ? doc.body.scrollHeight : 0;
      const modalVisible = !!doc.querySelector('dialog[open]');
      frame.style.height = Math.ceil(Math.max(120, mainHeight, bodyHeight,
        modalVisible ? window.innerHeight - 48 : 0)) + 'px';
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(doc.body);
    const modalObserver = new MutationObserver(resize);
    modalObserver.observe(doc.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    cleanupFrame = () => {
      observer.disconnect();
      modalObserver.disconnect();
      window.removeEventListener('resize', onResize);
    };

    const title = doc.title || 'Design Utilities';
    swapPanel(slot, path, title, push);
    resize();
  }

  function navigate(path, push) {
    if (!toolPaths.has(path)) return false;
    const id = ++requestId;
    // Cancel stale preloads when the user changes their selection quickly.
    main.querySelectorAll(':scope > .utilities-frame-slot[style*="position: absolute"]').forEach(
      slot => slot.remove()
    );
    if (path === initialPath) {
      if (cleanupFrame) { cleanupFrame(); cleanupFrame = null; }
      swapPanel('original', path, initialTitle, push);
      return true;
    }

    const slot = document.createElement('div');
    slot.className = 'utilities-frame-slot';
    // Load at the exact panel width without shifting the current page.
    const panelWidth = visiblePanel()?.getBoundingClientRect().width || 800;
    slot.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;' +
      'width:' + Math.max(200, panelWidth) + 'px;view-transition-name:none;';

    const frame = document.createElement('iframe');
    frame.className = 'utilities-frame';
    frame.title = 'Design utility';
    frame.setAttribute('loading', 'eager');
    const url = new URL(path, location.origin);
    url.searchParams.set('utilitiesFrame', '1');
    frame.addEventListener('load', () => {
      if (id !== requestId) { slot.remove(); return; }
      activateFrame(frame, slot, path, push);
    }, { once: true });
    frame.addEventListener('error', () => {
      if (id === requestId) location.assign(path);
    }, { once: true });
    frame.src = url.href;
    slot.append(frame);
    main.append(slot);
    return true;
  }

  sidebar.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') ||
        (link.target && link.target !== '_self')) return;
    if (!link.closest('.utilities-menu')) {
      if (link.matches('.utilities-home, .utilities-overview')) prepareForNavigationAway();
      return;
    }
    const url = new URL(link.href);
    if (url.origin !== location.origin || !toolPaths.has(url.pathname)) return;
    event.preventDefault();
    if (url.pathname === location.pathname) {
      ++requestId;
      main.querySelectorAll(':scope > .utilities-frame-slot[style*="position: absolute"]').forEach(
        slot => slot.remove()
      );
      return;
    }
    navigate(url.pathname, true);
  });

  window.addEventListener('popstate', () => {
    if (!navigate(location.pathname, false)) location.reload();
  });
})();
