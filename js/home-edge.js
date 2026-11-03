// The decorative strip uses document space beyond Safari's layout viewport.
(() => {
  const root = document.documentElement;
  if (!/\biPhone\b/i.test(navigator.userAgent) || !navigator.maxTouchPoints) return;
  function update() {
    const gap = screen.width - root.clientWidth;
    root.toggleAttribute('data-home-edge', gap >= 40 && gap <= 240);
    root.style.setProperty('--home-bleed', Math.max(0, gap) + 'px');
    root.toggleAttribute('data-home-zoom', (window.visualViewport?.scale || 1) > 1.01);
  }
  update();
  window.addEventListener('resize', update);
  window.visualViewport?.addEventListener('resize', update);
})();
