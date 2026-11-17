// Navigation markup is present in each utility's HTML before the first paint.
// Basketball stays on the main /tools/ overview only.
(() => {
  'use strict';
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

  // Let the browser animate cross-document navigations where supported.
  // Older browsers receive an exit + entrance animation around a normal link.
  const nativeTransitions =
    typeof document.startViewTransition === 'function' &&
    typeof CSS !== 'undefined' &&
    CSS.supports('view-transition-name', 'utilities-panel');
  if (nativeTransitions) return;

  let leaving = false;
  document.addEventListener('click', event => {
    if (leaving || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
        matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const link = event.target.closest?.('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    if (!link.closest('.utilities-sidebar, main.card > nav[aria-label="Design utilities"]')) return;

    const destination = new URL(link.href, location.href);
    if (destination.origin !== location.origin ||
        !destination.pathname.startsWith('/tools/') ||
        destination.pathname === location.pathname) return;

    event.preventDefault();
    leaving = true;
    try { sessionStorage.setItem('jm-utilities-next-page', destination.pathname); } catch {}
    document.documentElement.classList.add('utilities-fallback-exiting');
    window.setTimeout(() => location.assign(destination.href), 155);
  });
})();
