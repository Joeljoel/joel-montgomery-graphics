(() => {
 const q=s=>document.querySelector(s), glyph=q('#glyph'), inks=[...document.querySelectorAll('.ident use')], range=q('#playhead'), btn=q('#play'), out=q('.transport output'), rm=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,run=0,start=0;
 function draw(f){
 frame=Math.max(0,Math.min(120,f));const t=frame/120, beat=Math.sin(Math.PI*t), bend=beat*Math.sin(2*Math.PI*t+.55), j=114+58*bend, m=j+34, valley=m+(334-m)*(.5-.19*bend);
 glyph.setAttribute('d', 'M18 121Q18 184 '+((18+j)/2)+' 184T'+j+' 132V25 M'+m+' 185V25L'+valley+' '+(142-65*bend)+'L334 25V185');
 inks.forEach((ink,i)=>{let k=2-i;ink.setAttribute('transform','translate('+k*19*bend+' '+(-k*14*beat)+')');ink.setAttribute('stroke-width',String(28+13*bend));ink.setAttribute('stroke-dasharray','1100');ink.setAttribute('stroke-dashoffset',String(1000*Math.pow(1-t,10)))});
 range.value=Math.round(frame);out.value=String(Math.round(frame)).padStart(3,'0')+' / 120';
 }
 function stop(){cancelAnimationFrame(run);run=0;btn.textContent=frame>=120?'Replay':'Play'}
 function tick(now){draw((now-start)*.03);if(frame>=120)stop();else run=requestAnimationFrame(tick)}
 function play(){document.body.classList.remove('editing');if(frame>=120)draw(0);start=performance.now()-frame/.03;btn.textContent='Pause';run=requestAnimationFrame(tick)}
 function edit(){stop();document.body.classList.add('editing')}
 range.addEventListener('pointerdown',edit);range.oninput=()=>{edit();draw(+range.value);stop()};btn.onclick=()=>run?stop():play();
 q('.transport').hidden=false;draw(120);stop();if(!rm.matches)play();rm.onchange=()=>{draw(120);stop();document.body.classList.remove('editing')};
})();