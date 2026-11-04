(() => {
 const q=s=>document.querySelector(s), strokes=[...document.querySelectorAll('#strokes path')], guides=[...document.querySelector('#vectors').children], range=q('#playhead'), btn=q('#play'), out=q('.transport output'), rm=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,run=0,start=0;
 const lines=[...document.querySelectorAll('.type-line')];
 const ns='http://www.w3.org/2000/svg';
 const outlines=strokes.map(()=>{const p=document.createElementNS(ns,'path');p.setAttribute('stroke','#ffe6aa');p.setAttribute('stroke-width','1.2');q('#speed-ink').append(p);return p});
 const clamp=x=>Math.max(0,Math.min(1,x)), burst=x=>1-(1-clamp(x))**3;
 function draw(f){
 frame=clamp(f/72)*72;
 strokes.forEach((p,i)=>{
 const age=frame-i*11,u=burst(age/(i?43:35)), fill=burst((age-2.4)/(i?46:38)), settle=burst(age/40);
 p.setAttribute('d',i?'M151 184V'+(25-8*(1-settle))+'L241 '+(143+19*(1-settle))+'L333 25V184':'M114 '+(25-22*(1-settle))+'V128C114 '+(204+14*(1-settle))+' 18 '+(204+14*(1-settle))+' 18 122');
 const len=p.getTotalLength(),w=18+6*settle+4*Math.sin(settle*Math.PI);
 p.style.strokeWidth=w+'px';p.setAttribute('stroke-linecap','butt');p.setAttribute('stroke-linejoin','round');
 p.setAttribute('stroke-dasharray',fill>=1?'none':(len*fill)+' '+(len+1));p.style.opacity=fill>0?1:0;
 const rails=[[],[]];for(let j=0;j<=24;j++){const d=len*(fill+(u-fill)*j/24),pt=p.getPointAtLength(d),a=p.getPointAtLength(Math.max(0,d-.3)),b=p.getPointAtLength(Math.min(len,d+.3)),dx=b.x-a.x,dy=b.y-a.y,k=w/2/(Math.hypot(dx,dy)||1);rails.forEach((r,n)=>r.push([pt.x+(n?1:-1)*dy*k,pt.y-(n?1:-1)*dx*k].join(',')))}
 outlines[i].setAttribute('d','M'+rails[0].join('L')+'L'+rails[1].reverse().join('L')+'Z');outlines[i].style.opacity=u>fill?1:0;
 if(document.body.classList.contains('editing')){
 const [route,box,first,last,dot]=guides[i].children,points=Array.from({length:33},(_,j)=>p.getPointAtLength(len*u*j/32)),xs=points.map(v=>v.x),ys=points.map(v=>v.y),tip=points.at(-1);
 route.setAttribute('d',p.getAttribute('d'));const rect=(el,x,y,width,height)=>Object.entries({x,y,width,height}).forEach(([k,v])=>el.setAttribute(k,v));
 rect(box,Math.min(...xs)-w/2,Math.min(...ys)-w/2,Math.max(...xs)-Math.min(...xs)+w,Math.max(...ys)-Math.min(...ys)+w);[first,last].forEach((el,j)=>{const v=p.getPointAtLength(j*len);rect(el,v.x-2,v.y-2,4,4)});dot.setAttribute('cx',tip.x);dot.setAttribute('cy',tip.y);
 }
 });
 lines.forEach((el,i)=>{const u=burst((frame-[5,15,29,36][i])/[32,39,29,31][i]),k=1-u;
 el.style.transformOrigin=i===1?'right':'left';el.style.transform='scaleX('+(1+(i===1?.32:-.24)*k)+')';el.style.clipPath=i===1?'inset(0 0 0 '+100*k+'%)':'inset(0 '+100*k+'% 0 0)';el.style.textShadow=k>.01?(-12*k)+'px 0 #ff8060,'+ (8*k)+'px 0 #a5ffda':'none';
 });
 document.querySelector('.tracks').style.setProperty('--time',100*frame/72+'%');range.value=Math.round(frame);out.value=String(Math.round(frame)).padStart(3,'0')+' / 72';
 }
 function stop(){cancelAnimationFrame(run);run=0;btn.textContent=frame>=72?'Replay':'Play'}
 function tick(now){draw((now-start)*.03);if(frame>=72)stop();else run=requestAnimationFrame(tick)}
 function play(){document.body.classList.remove('editing');if(frame>=72)draw(0);start=performance.now()-frame/.03;btn.textContent='Pause';run=requestAnimationFrame(tick)}
 function edit(){stop();document.body.classList.add('editing');draw(frame)}
 range.addEventListener('pointerdown',edit);range.oninput=()=>{const requested=Number(range.value);stop();document.body.classList.add("editing");draw(requested);stop()};btn.onclick=()=>run?stop():play();
 q('.transport').hidden=false;draw(72);stop();if(!rm.matches)play();rm.onchange=()=>{draw(72);stop();document.body.classList.remove('editing')};
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
