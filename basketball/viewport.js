/* Duo scenery extension: preserve content/input coordinates and native scrolling. */
(() => {
 const root = document.documentElement, vv = window.visualViewport;
 let orientation = '', side = 0, queued = 0;
 function update() {
  queued = 0;
  // Pinch zoom must not feed back into the layout.
  if ((vv?.scale || 1) > 1.01) return;
  const next = matchMedia('(orientation:portrait)').matches ? 'portrait' : 'landscape';
  if (next !== orientation) { orientation = next; side = 0; }
  const gap = screen.width - root.clientWidth;
  if (/\biPhone\b/i.test(navigator.userAgent) && navigator.maxTouchPoints && gap >= 40 && gap <= 240) side = gap;
  root.toggleAttribute('data-basketball-duo', side > 0);
  root.style.setProperty('--duo-side', side + 'px');
  root.style.setProperty('--duo-usable-height', (vv?.height || innerHeight) + 'px');
 }
 function schedule() { if (!queued) queued = requestAnimationFrame(update); }
 update();
 addEventListener('resize', schedule);
 addEventListener('pageshow', schedule);
 vv?.addEventListener('resize', schedule);
})();
