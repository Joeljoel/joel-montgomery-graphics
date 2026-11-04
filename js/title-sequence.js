(() => {
 const q=s=>document.querySelector(s), strokes=[...document.querySelectorAll('#strokes path')], guides=[...document.querySelector('#vectors').children], range=q('#playhead'), btn=q('#play'), out=q('.transport output'), rm=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,run=0,start=0;
 const lines=[...document.querySelectorAll('.type-line')];
 const ns='http://www.w3.org/2000/svg';
 const outlines=strokes.map(()=>{const p=document.createElementNS(ns,'path');p.setAttribute('stroke','#ffe6aa');p.setAttribute('stroke-width','1.2');q('#speed-ink').append(p);return p});
 const type=lines.map(line=>{
  const text=line.textContent;line.setAttribute('aria-label',text);line.replaceChildren();
  return text.split(/( )/).flatMap(word=>{
   if(word===' '){line.append(' ');return []}
   const wrap=document.createElement('span');wrap.className='type-word';wrap.setAttribute('aria-hidden','true');line.append(wrap);
   return [...word].map(c=>{const el=document.createElement('span');el.textContent=c;wrap.append(el);return el})
  })
 });
 function draw(f){
 frame=Math.max(0,Math.min(210,f));const clamp=x=>Math.max(0,Math.min(1,x)), ease=x=>x*x*(3-2*x), mix=(a,b,t)=>a+(b-a)*t;
 const shapes=[[114,25,114,60,114,100,114,133],[114,133,114,203,18,204,18,122],[150,184,150,130,150,80,150,25],[150,25,180,63,210,102,241,142],[241,142,273,103,304,63,334,25],[334,25,334,78,334,132,334,184]];
 strokes.forEach((stroke,i)=>{
  const a=shapes[i],start=a.slice(0,2),to=a.slice(6),age=frame-[0,11,37,49,61,73][i];
  const settle=ease(clamp(age/37)), weight=14+10*settle+4*Math.sin(Math.PI*settle);
  // Lower the entrance and lift the bowl independently as the pen rounds it.
  const pts=Array.from({length:4},(_,j)=>[a[j*2],a[j*2+1]+(1-ease(clamp((frame-(i<2?0:37))/46)))*(a[j*2+1]-100)*.31]);
  function geometry(t){
   const blend=(p,q)=>p.map((v,k)=>mix(v,q[k],t));
   const [A,B,C,D]=pts,E=blend(A,B),F=blend(B,C),G=blend(C,D),H=blend(E,F),I=blend(F,G),J=blend(H,I);
   return {d:'M'+A+'C'+E+' '+H+' '+J,tip:J,normal:[-(I[1]-H[1]),I[0]-H[0]]};
  }
  const lead=ease(clamp(age/20)),fill=ease(clamp((age-5)/22));
  const rails=[[],[]];for(let k=0;k<=18;k++){const g=geometry(mix(fill,lead,k/18)),len=Math.hypot(...g.normal)||1;
   rails.forEach((rail,j)=>rail.push(g.tip.map((v,m)=>v+(j?1:-1)*weight*.5*g.normal[m]/len).join(',')))}
  outlines[i].setAttribute('d','M'+rails[0].join('L')+'L'+rails[1].reverse().join('L')+'Z');
  outlines[i].style.opacity=lead>fill?1:0;
  stroke.setAttribute('d',geometry(fill).d);stroke.style.strokeWidth=weight+'px';stroke.setAttribute('opacity',fill>0?1:0);
  stroke.setAttribute('stroke-linecap','butt');
  if(document.body.classList.contains('editing')){
   const [route,box,first,last,anchor]=guides[i].children;
   route.setAttribute('d','M'+start+'L'+to);
   const rect=(n,x,y,w,h)=>Object.entries({x,y,width:w,height:h}).forEach(([k,v])=>n.setAttribute(k,v));
   const b=stroke.getBBox();rect(box,b.x-weight/2,b.y-weight/2,b.width+weight,b.height+weight);
   rect(first,start[0]-2,start[1]-2,4,4);rect(last,to[0]-2,to[1]-2,4,4);
   const tip=stroke.getPointAtLength(stroke.getTotalLength());anchor.setAttribute('cx',tip.x);anchor.setAttribute('cy',tip.y);
  }
 });
 type.forEach((letters,row)=>letters.forEach((el,j)=>{
  const order=row%2?letters.length-1-j:j,u=ease(clamp((frame-23-row*19-order*(row<2?3.3:1.1))/34)),k=1-u;
  el.style.opacity=u;el.style.transform='perspective(220px) rotateX('+(k*(row%2?-86:86))+'deg) skewX('+(k*-20)+'deg) scaleX('+(1+k*.55)+')';
  el.style.webkitTextStrokeWidth=k>.34?'0.7px':'0';el.style.color=k>.34?'transparent':'inherit';
 }));
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
