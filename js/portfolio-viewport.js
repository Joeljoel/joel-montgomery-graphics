(() => {
  if (!/\biPhone\b/i.test(navigator.userAgent) || !navigator.maxTouchPoints) return;
  const root = document.documentElement;
  function update() {
    const gap = screen.width - root.clientWidth;
    root.style.setProperty('--strip', Math.max(0,gap) + 'px');
    root.toggleAttribute('data-side-strip', gap >= 40 && gap <= 240);
    root.toggleAttribute('data-magnified', (window.visualViewport?.scale || 1) > 1.01);
  }
  update();
  window.addEventListener('resize',update);
  window.visualViewport?.addEventListener('resize',update);
})();
