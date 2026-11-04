(() => {
 const q=s=>document.querySelector(s), strokes=[...document.querySelectorAll('#strokes path')], guides=[...document.querySelector('#vectors').children], range=q('#playhead'), btn=q('#play'), out=q('.transport output'), rm=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,run=0,start=0;
 const lines=[...document.querySelectorAll('.type-line')];
 const trails=strokes.map(()=>['#ff8054','#c1ffdc','#1727ab'].map(col=>{
  const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('stroke',col);q('#speed-ink').append(p);return p;
 }));
 function draw(f){
 frame=Math.max(0,Math.min(210,f));const clamp=x=>Math.max(0,Math.min(1,x)), ease=x=>x*x*(3-2*x), mix=(a,b,t)=>a+(b-a)*t;
 const shapes=[[114,25,114,60,114,100,114,133],[114,133,114,203,18,204,18,122],[150,184,150,130,150,80,150,25],[150,25,180,63,210,102,241,142],[241,142,273,103,304,63,334,25],[334,25,334,78,334,132,334,184]];
 strokes.forEach((stroke,i)=>{
  const a=shapes[i], from=[[114,25],[114,175],[151,184],[151,25],[241,157],[334,25]][i], to=[[114,175],[18,175],[151,25],[241,157],[334,25],[334,184]][i];
  const start=from, age=frame-[0,17,33,47,61,75][i], morph=ease(clamp((frame-106)/66));
  const pts=Array.from({length:4},(_,j)=>from.map((v,k)=>mix(mix(v,to[k],j/3),a[j*2+k],morph)));
  const sample=t=>{
   const blend=(p,q)=>p.map((v,k)=>mix(v,q[k],t));
   const [A,B,C,D]=pts,E=blend(A,B),F=blend(B,C),G=blend(C,D),H=blend(E,F),I=blend(F,G);
   return 'M'+A+'C'+E+' '+H+' '+blend(H,I);
  };
  const weight=7+17*morph+6*Math.sin(Math.PI*morph), A=pts[0];
  trails[i].forEach((p,k)=>{
   const t=clamp((age-k*2)/16);
   p.setAttribute('d',sample(t));p.setAttribute('stroke-width',[weight+6,weight+2,weight-1][k]);
   p.setAttribute('opacity',age>k*2?1-ease(clamp((age-23)/12)):0);
  });
  stroke.setAttribute('d',sample(clamp((age-5)/16)));stroke.setAttribute('opacity',age>5?1:0);stroke.setAttribute('stroke-width',weight);
  if(document.body.classList.contains('editing')){
   const [route,box,first,last,anchor]=guides[i].children;
   route.setAttribute('d','M'+start+'L'+to);
   const rect=(n,x,y,w,h)=>Object.entries({x,y,width:w,height:h}).forEach(([k,v])=>n.setAttribute(k,v));
   const b=stroke.getBBox();rect(box,b.x-weight/2,b.y-weight/2,b.width+weight,b.height+weight);
   rect(first,start[0]-2,start[1]-2,4,4);rect(last,to[0]-2,to[1]-2,4,4);
   const tip=stroke.getPointAtLength(stroke.getTotalLength());anchor.setAttribute('cx',tip.x);anchor.setAttribute('cy',tip.y);
  }
 });
 lines.forEach((line,i)=>{const u=ease(clamp((frame-60-i*24)/68));line.style.opacity=u;line.style.transform='translateY('+((1-u)*.55)+'em)';line.style.clipPath='inset(0 0 '+((1-u)*100)+'% 0)';});
 document.querySelector('.tracks').style.setProperty('--time',(100*frame/210)+'%');
 range.value=Math.round(frame);out.value=String(Math.round(frame)).padStart(3,'0')+' / 210';
 }
 function stop(){cancelAnimationFrame(run);run=0;btn.textContent=frame>=210?'Replay':'Play'}
 function tick(now){draw((now-start)*.03);if(frame>=210)stop();else run=requestAnimationFrame(tick)}
 function play(){document.body.classList.remove('editing');if(frame>=210)draw(0);start=performance.now()-frame/.03;btn.textContent='Pause';run=requestAnimationFrame(tick)}
 function edit(){stop();document.body.classList.add('editing');draw(frame)}
 range.addEventListener('pointerdown',edit);range.oninput=()=>{const requested=Number(range.value);stop();document.body.classList.add("editing");draw(requested);stop()};btn.onclick=()=>run?stop():play();
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
