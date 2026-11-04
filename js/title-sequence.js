(() => {
 const q=s=>document.querySelector(s), strokes=[...document.querySelectorAll('#strokes path')], guides=[...document.querySelector('#vectors').children], range=q('#playhead'), btn=q('#play'), out=q('.transport output'), rm=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,run=0,start=0;
 const lines=[...document.querySelectorAll('.type-line')];
 const ns='http://www.w3.org/2000/svg';
 const outlines=strokes.map(()=>{const p=document.createElementNS(ns,'path');p.setAttribute('stroke','#ffe6aa');p.setAttribute('stroke-width','1.2');q('#speed-ink').append(p);return p});
 const clamp=x=>Math.max(0,Math.min(1,x)), burst=x=>1-(1-clamp(x))**4;
 function draw(f){
 frame=clamp(f/72)*72;
 const rest=document.body.dataset.look==='tools'?31:document.body.dataset.look==='lab'?15:24;
 const weights=[0,11].map(delay=>{const t=clamp((frame-delay)/42);return 5+(rest-5)*burst(t)+17*Math.sin(Math.PI*t)**2});
 // Centre the full mark while leaving 13 units between the two ink edges.
 const advance=(weights[0]+weights[1])/2+13-(151-114);
 const centreShift=-(advance+(weights[1]-weights[0])/2)/2;
 strokes.forEach((p,i)=>{
 const age=frame-i*11,u=burst(age/(i?43:35)), fill=burst((age-2.4)/(i?46:38)), settle=burst(age/40);
 p.setAttribute('d',i?'M151 196V'+(37-8*(1-settle))+'L241 '+(155+19*(1-settle))+'L333 37V196':'M114 '+(25-22*(1-settle))+'V128C114 '+(204+14*(1-settle))+' 18 '+(204+14*(1-settle))+' 18 122');
 const matrix='translate('+(centreShift+(i?advance:0))+' 0)';
 [p,outlines[i],guides[i]].forEach(el=>el.setAttribute('transform',matrix));
 const len=p.getTotalLength(),w=weights[i];
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
 el.style.transformOrigin=i===1?'right':'left';el.style.transform='scaleX('+(1+(i===1?.32:-.24)*k)+')';el.style.clipPath=u===1?'none':i===1?'inset(-25% -3% -35% '+100*k+'%)':'inset(-25% '+100*k+'% -35% -3%)';el.style.letterSpacing=(-.055+.09*k)+'em';el.style.opacity=clamp(u*4);el.style.textShadow=k>.01?(-12*k)+'px 0 #ff8060,'+ (8*k)+'px 0 #a5ffda':'none';
 });
 document.querySelector('.tracks').style.setProperty('--time',100*frame/72+'%');range.value=Math.round(frame);out.value=String(Math.round(frame)).padStart(3,'0')+' / 72';
 }
 function stop(){cancelAnimationFrame(run);run=0;btn.textContent=frame>=72?'Replay':'Play'}
 function tick(now){draw((now-start)*.045);if(frame>=72)stop();else run=requestAnimationFrame(tick)}
 function play(){document.body.classList.remove('editing');if(frame>=72)draw(0);start=performance.now()-frame/.045;btn.textContent='Pause';run=requestAnimationFrame(tick)}
 function edit(){stop();document.body.classList.add('editing');draw(frame)}
 range.addEventListener('pointerdown',edit);range.oninput=()=>{const requested=Number(range.value);stop();document.body.classList.add("editing");draw(requested);stop()};btn.onclick=()=>run?stop():play();
 new MutationObserver(()=>draw(frame)).observe(document.body,{attributes:true,attributeFilter:['data-look']});
 q('.transport').hidden=false;draw(72);stop();if(!rm.matches)play();rm.onchange=()=>{draw(72);stop();document.body.classList.remove('editing')};
})();
(() => {
 const cards=[...document.querySelectorAll('.work > a')], looks=['tools','lab'],touch=matchMedia('(hover:none)');
 let hover='',focus='',scroll='',raf=0;
 function paint(){const look=hover||focus||scroll;if(look)document.body.dataset.look=look;else delete document.body.dataset.look}
 function scan(){raf=0;scroll='';if(touch.matches){const y=(window.visualViewport?.height||innerHeight)*.5;cards.forEach((c,i)=>{const r=c.getBoundingClientRect();if(r.top<=y && r.bottom>=y)scroll=looks[i]})}paint()}
 function queue(){if(!raf)raf=requestAnimationFrame(scan)}
 cards.forEach((c,i)=>{c.onpointerenter=e=>{if(e.pointerType==='mouse'){hover=looks[i];paint()}};c.onpointerleave=()=>{hover='';paint()};c.onfocus=()=>{if(c.matches(':focus-visible')){focus=looks[i];paint()}};c.onblur=()=>{focus='';paint()}});
 addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);touch.addEventListener('change',queue);scan();
})();
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'), range=document.querySelector('#playhead');
 const words=[...document.querySelectorAll('h1 .type-line')].map(line=>{
  const name=line.textContent;line.setAttribute('aria-label',name);
  const letters=[...name].map(c=>{const el=document.createElement('span');el.textContent=c;el.setAttribute('aria-hidden','true');return el});
  line.replaceChildren(...letters);return letters;
 });
 const header=document.querySelector('header'), hero=document.querySelector('.hero'), ident=hero.querySelector('.ident');
 const lens=document.createElement('div');lens.className='pressure-field';lens.setAttribute('aria-hidden','true');header.prepend(lens);
 let pointer=null, strength=0, px=0,py=0;
 header.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&!reduced.matches){pointer=[e.clientX,e.clientY]}});
 header.addEventListener('pointerleave',()=>pointer=null);
 const canvas=document.createElement('canvas').getContext('2d');let metrics=[];
 function measure(){metrics=words.map(letters=>{const st=getComputedStyle(letters[0]);canvas.font='700 '+st.fontSize+' '+st.fontFamily;return letters.map(el=>canvas.measureText(el.textContent).width)})}
 new ResizeObserver(measure).observe(hero);document.fonts.ready.then(measure);measure();
 let phase=0,prev=0,raf=0,visible=true;
 function draw(now){
  raf=0;if(!visible||document.hidden||reduced.matches)return;
  phase+=Math.min(50,now-prev)*(Number(range.value)<72?.004:.00023);prev=now;
  const rect=header.getBoundingClientRect();strength+=((pointer?1:0)-strength)*.14;
  if(pointer){px+=(pointer[0]-px)*.33;py+=(pointer[1]-py)*.33}
  lens.style.transform='translate('+ (px-rect.left)+'px,'+(py-rect.top)+'px)';lens.style.opacity=strength;
  const displacement=(x,y)=>{const dx=x-px,dy=y-py,force=.28*strength*Math.exp(-(dx*dx+dy*dy)/31000);return [dx*force,dy*force]};
  const ib=ident.getBoundingClientRect(),off=displacement(ib.left+ib.width/2,ib.top+ib.height/2);
  ident.style.translate=off.join('px ')+'px';
  words.forEach((letters,row)=>{
   const widths=metrics[row], total=widths.reduce((a,b)=>a+b,0);
   const line=letters[0].parentElement.getBoundingClientRect();
   const wave=letters.map((_,i)=>Math.sin(phase*(.84+i*.037)+i*1.47+row+ .72*Math.sin(phase*.61+i)));
   letters.forEach((el,i)=>el.style.fontWeight=Math.round(570+425*wave[i]));
   const natural=letters.map(el=>el.offsetWidth),desired=widths.map((w,i)=>w*(1+.105*wave[i])),sum=desired.reduce((a,b)=>a+b,0);
   let at=0,source=0;letters.forEach((el,i)=>{const w=desired[i]*total/(sum||1),[x,y]=displacement(line.left+at+w/2,line.top+line.height/2);
    el.style.transform='translate('+(at-source+x)+'px,'+y+'px) scaleX('+w/(natural[i]||1)+')';source+=natural[i];at+=w});
  });raf=requestAnimationFrame(draw);
 }
 function sync(){cancelAnimationFrame(raf);if(reduced.matches){pointer=null;strength=0;lens.style.opacity=0;ident.style.translate="none"}prev=performance.now();if(reduced.matches)words.flat().forEach(el=>{el.style.transform='';el.style.fontWeight='' });else if(visible&&!document.hidden)raf=requestAnimationFrame(draw)}
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()}).observe(document.querySelector('h1'));
 reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);
})();