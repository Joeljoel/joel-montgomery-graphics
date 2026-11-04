(() => {
  if (!/\biPhone\b/i.test(navigator.userAgent) || !navigator.maxTouchPoints) return;
  const root = document.documentElement;
  function update() {
    const gap = screen.width - root.clientWidth;
    root.style.setProperty('--strip', Math.max(0,gap) + 'px');
    root.toggleAttribute('data-side-strip', gap >= 40 && gap <= 240);
    root.toggleAttribute('data-magnified', (window.visualViewport?.scale || 1) > 1.01);
  }
  let startX=0,startY=0,track=false;
  window.addEventListener('touchstart',e=>{
    track=e.touches.length===1 && !e.target.closest('input[type="range"]');
    if(track){startX=e.touches[0].clientX;startY=e.touches[0].clientY}
  },{passive:true});
  window.addEventListener('touchmove',e=>{
    if(!track||e.touches.length!==1||!root.hasAttribute('data-side-strip')||root.hasAttribute('data-magnified'))return;
    const dx=Math.abs(e.touches[0].clientX-startX),dy=Math.abs(e.touches[0].clientY-startY);
    if(dx>4 && dx>dy*1.35 && e.cancelable)e.preventDefault();
  },{passive:false});
  update();
  window.addEventListener('resize',update);
  window.visualViewport?.addEventListener('resize',update);
})();
