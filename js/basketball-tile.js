/* One-shot illustration animation. All geometry stays in the 480 × 240 SVG space. */
(() => {
  const art = document.querySelector('.hoopboard');
  if (!art) return;
  const card = art.closest('a');
  const ball = art.querySelector('.hoop-ball');
  const net = art.querySelector('.jb-net');
  const trail = art.querySelector('.jb-flight-trail');
  const strokes = [...trail.children];
  const echoes = art.querySelector('.jb-flight-echoes');
  const glint = art.querySelector('.jb-rim-glint');
  const speed = art.querySelector('.jb-speed-back');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const coarse = matchMedia('(hover: none)');
  const clamp = n => Math.max(0, Math.min(1, n));
  const mix = (a, b, t) => a + (b - a) * t;
  const ease = t => 1 - Math.pow(1 - t, 3);
  let frame = 0, started = 0;

  function pose(t) {
    if (t < 130) { // Anticipation: compress, then release.
      const q = Math.sin(clamp(t / 130) * Math.PI / 2);
      return {x:82 - 5*q,y:201 + 4*q,s:1,stretch:1 - .16*q,r:-8*q};
    }
    if (t < 610) {
      const q = clamp((t - 130) / 480), u = ease(q);
      // Quadratic arc with a high control point; rapid launch eases at its apex.
      return {x:mix(77,251,u),y:(1-u)**2*205 + 2*(1-u)*u*(-65) + u*u*82,
        s:mix(1,.43,u),stretch:1 + .45*Math.sin(q*Math.PI),r:mix(-8,160,u)};
    }
    const q = clamp((t - 610) / 420);
    return {x:251 + 8*q*q,y:82 + 173*q*q,s:.43,stretch:1 + .14*Math.sin(q*Math.PI),r:160 + 100*q};
  }
  function reset() {
    cancelAnimationFrame(frame); frame = 0;
    ball.removeAttribute('transform'); ball.style.opacity = '';
    net.removeAttribute('transform');
    trail.style.opacity = echoes.style.opacity = glint.style.opacity = '0';
    speed.style.opacity = ''; speed.removeAttribute('transform');
  }
  function draw(now) {
    const t = now - started, p = pose(t);
    if (t >= 1500) { reset(); return; }
    const returnProgress = clamp((t - 1210) / 290);
    if (t >= 1210) {
      ball.setAttribute('transform',`translate(82 201) scale(${mix(.88,1,ease(returnProgress))}) translate(-82 -201)`);
      ball.style.opacity = returnProgress;
    } else {
      ball.setAttribute('transform',`translate(${p.x} ${p.y}) rotate(${p.r}) scale(${p.s/p.stretch} ${p.s*p.stretch}) translate(-82 -201)`);
      ball.style.opacity = 1 - clamp((t - 970) / 90);
    }
    // Short history of the actual flight, rather than a fixed streak behind a stationary ball.
    const active = t > 145 && t < 980;
    trail.style.opacity = active ? .8 * Math.min(1,(t-145)/60) : 0;
    echoes.style.opacity = active ? .55 : 0;
    const points = Array.from({length:10},(_,i) => pose(Math.max(130,t-125+i*125/9)));
    strokes.forEach((path,i) => path.setAttribute('d',points.map((v,j)=>`${j?'L':'M'}${v.x} ${v.y+i*5}`).join(' ')));
    [...echoes.children].forEach((el,i)=>{
      const old = pose(Math.max(130,t-55-i*36));
      el.setAttribute('cx',old.x); el.setAttribute('cy',old.y);
      el.setAttribute('rx',39*old.s); el.setAttribute('ry',34*old.s);
      el.setAttribute('opacity',.5-i*.13);
    });
    // The ball crosses the rim at ~856ms. Net displacement decays without moving its attachment.
    const hit = Math.max(0,t-850), kick = t < 850 ? 0 : Math.sin(hit/70)*Math.exp(-hit/180);
    net.setAttribute('transform',`translate(156 148) skewX(${kick*5}) scale(1 ${1+kick*.42}) translate(-156 -148)`);
    const burst = clamp(hit/230);
    glint.style.opacity = t >= 850 && t < 1080 ? (1-burst)**2 : 0;
    glint.setAttribute('transform',`translate(251 143) scale(${.65+burst*.85})`);
    const rush = active ? Math.sin(clamp((t-130)/850)*Math.PI) : 0;
    speed.style.opacity = .25 + rush*.38;
    speed.setAttribute('transform',`translate(${-rush*18} ${rush*7})`);
    frame = requestAnimationFrame(draw);
  }
  function play() {
    if (reduced.matches || frame || document.hidden) return;
    started = performance.now(); frame = requestAnimationFrame(draw);
  }
  card.addEventListener('pointerenter', e => { if (e.pointerType !== 'touch') play(); });
  card.addEventListener('focus', play);
  // No touch handlers or prevented defaults: scrolling and following the link remain native.
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting && coarse.matches) play();
      if (!entry.isIntersecting) reset();
    }
  }, {threshold:.65});
  observer.observe(art);
  reduced.addEventListener('change', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
})();
