(() => {
 const q=s=>document.querySelector(s), strokes=[...document.querySelectorAll('#strokes path')], guides=[...document.querySelector('#vectors').children], range=q('#playhead'), btn=q('#play'), out=q('.transport output'), rm=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,run=0,start=0;
 function draw(f){
 frame=Math.max(0,Math.min(210,f));const clamp=x=>Math.max(0,Math.min(1,x)), ease=x=>x*x*(3-2*x), mix=(a,b,t)=>a+(b-a)*t;
 const shapes=[[114,25,114,60,114,100,114,133],[114,133,114,203,18,204,18,122],[150,184,150,130,150,80,150,25],[150,25,180,63,210,102,241,142],[241,142,273,103,304,63,334,25],[334,25,334,78,334,132,334,184]];
 strokes.forEach((stroke,i)=>{
  const a=shapes[i], start=[30+52*i,85+(i%2)*34], progress=clamp((frame/210-i*.025)/.8);
  const u=ease(progress), morph=ease(clamp((progress-.18)/.82)), reveal=.04+.96*ease(clamp(progress/.78));
  // Morph a horizontal construction stroke into a cubic, then split it at the draw head.
  const pts=Array.from({length:4},(_,j)=>[mix(start[0]+j*11,a[j*2],morph),mix(start[1],a[j*2+1],morph)]);
  const lerp=(p,q)=>p.map((v,k)=>mix(v,q[k],reveal));
  const [A,B,C,D]=pts,E=lerp(A,B),F=lerp(B,C),G=lerp(C,D),H=lerp(E,F),I=lerp(F,G),J=lerp(H,I);
  const weight=2+22*u+10*Math.sin(Math.PI*u);
  stroke.setAttribute('d','M'+A+'C'+E+' '+H+' '+J);stroke.setAttribute('stroke-width',weight);
  if(document.body.classList.contains('editing')){
   const [route,box,first,last,anchor]=guides[i].children;
   route.setAttribute('d','M'+start+'L'+a.slice(0,2));
   const rect=(n,x,y,w,h)=>Object.entries({x,y,width:w,height:h}).forEach(([k,v])=>n.setAttribute(k,v));
   const b=stroke.getBBox();rect(box,b.x-weight/2,b.y-weight/2,b.width+weight,b.height+weight);
   rect(first,start[0]-2,start[1]-2,4,4);rect(last,a[0]-2,a[1]-2,4,4);
   anchor.setAttribute('cx',A[0]);anchor.setAttribute('cy',A[1]);
  }
 });
 document.querySelector('.tracks').style.setProperty('--time',(100*frame/210)+'%');
 range.value=Math.round(frame);out.value=String(Math.round(frame)).padStart(3,'0')+' / 210';
 }
 function stop(){cancelAnimationFrame(run);run=0;btn.textContent=frame>=210?'Replay':'Play'}
 function tick(now){draw((now-start)*.03);if(frame>=210)stop();else run=requestAnimationFrame(tick)}
 function play(){document.body.classList.remove('editing');if(frame>=210)draw(0);start=performance.now()-frame/.03;btn.textContent='Pause';run=requestAnimationFrame(tick)}
 function edit(){stop();document.body.classList.add('editing');draw(frame)}
 range.addEventListener('pointerdown',edit);range.oninput=()=>{edit();draw(+range.value);stop()};btn.onclick=()=>run?stop():play();
 q('.transport').hidden=false;draw(210);stop();if(!rm.matches)play();rm.onchange=()=>{draw(210);stop();document.body.classList.remove('editing')};
})();
(() => {
 const body=document.body, cards=[...document.querySelectorAll('.work > a')], bar=document.querySelector('.audition'), buttons=[...bar.querySelectorAll('button')];
 let hover='', focus='', pinned='';
 function paint(){const look=hover||focus||pinned;if(look)body.dataset.look=look;else delete body.dataset.look;buttons.forEach(b=>b.setAttribute('aria-pressed',String(pinned===b.dataset.look)))}
 cards.forEach((card,i)=>{const look=buttons[i].dataset.look;
 card.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hover=look;paint()}});
 card.addEventListener('pointerleave',()=>{hover='';paint()});
 card.addEventListener('focus',()=>{if(card.matches(':focus-visible')){focus=look;paint()}});
 card.addEventListener('blur',()=>{focus='';paint()});
 });
 buttons.forEach(b=>b.onclick=()=>{pinned=pinned===b.dataset.look?'':b.dataset.look;paint()});
 bar.hidden=false;
})();
