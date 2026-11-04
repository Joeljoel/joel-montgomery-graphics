(() => {
 const q=s=>document.querySelector(s), strokes=[...document.querySelectorAll('#strokes path')], guides=[...document.querySelector('#vectors').children], range=q('#playhead'), btn=q('#play'), out=q('.transport output'), rm=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,run=0,start=0;
 const lines=[...document.querySelectorAll('.type-line')];
 const ns='http://www.w3.org/2000/svg';
 const outlines=strokes.map(()=>{const p=document.createElementNS(ns,'path');p.setAttribute('stroke','#ffe6aa');p.setAttribute('stroke-width','1.2');q('#speed-ink').append(p);return p});
 const clamp=x=>Math.max(0,Math.min(1,x)), burst=x=>1-(1-clamp(x))**4;
 let exchange=0, target=0, previous=0, hoverRAF=0;
 let base=[24,24], offsets=[0,0];
 function shape(i){
  const emphasis=exchange*(i?-1:1), weight=base[i]+emphasis*(emphasis<0?base[i]-2.5:Math.min(13,base[i]*.52));
  const span=i?146:96, left=i?151:18;
  const transfer=exchange*(exchange>0?(146+base[1])*.57:(96+base[0])*.53);
  const sx=(span+base[i]+(i?-transfer:transfer))/(span+weight);
  const shift=offsets[i]+(i?transfer:0)+left-base[i]/2-sx*(left-weight/2);
  for(const node of [strokes[i],outlines[i],guides[i]])node.setAttribute('transform','matrix('+sx+' 0 0 1 '+shift+' 0)');
  strokes[i].style.strokeWidth=weight+'px';return weight;
 }
 function breathe(now){
  const dt=Math.min(50,now-previous);previous=now;
  exchange+=(target-exchange)*(-Math.expm1(-dt/135));
  if(Math.abs(target-exchange)<.001 || rm.matches){exchange=rm.matches?0:target;hoverRAF=0}else hoverRAF=requestAnimationFrame(breathe);
  shape(0);shape(1);
 }
 const mark=q('.ident');
 function wake(){if(!hoverRAF){previous=performance.now();hoverRAF=requestAnimationFrame(breathe)}}
 mark.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||rm.matches)return;const b=mark.getBoundingClientRect();target=Math.tanh((.39-(e.clientX-b.left)/b.width)*6);wake()});
 mark.addEventListener('pointerleave',()=>{target=0;wake()});
 function draw(f){
 frame=clamp(f/72)*72;
 const rest=document.body.dataset.look==='tools'?46:document.body.dataset.look==='lab'?15:24;
 const weights=[0,11].map(delay=>{const t=clamp((frame-delay)/42);return 5+(rest-5)*burst(t)+17*Math.sin(Math.PI*t)**2});
 // Centre the full mark while leaving 13 units between the two ink edges.
 const advance=(weights[0]+weights[1])/2+13-(151-114);
 const centreShift=-(advance+(weights[1]-weights[0])/2)/2;
 base=weights;offsets=[centreShift,centreShift+advance];
 strokes.forEach((p,i)=>{
 const age=frame-i*11,u=burst(age/(i?43:35)), fill=burst((age-2.4)/(i?46:38)), settle=burst(age/40);
 p.setAttribute('d',i?'M151 196V'+(25-8*(1-settle))+'L224 '+(155+19*(1-settle))+'L297 25V196':'M114 '+(25-22*(1-settle))+'V128C114 '+(204+14*(1-settle))+' 18 '+(204+14*(1-settle))+' 18 122');
 const len=p.getTotalLength(),w=shape(i);
 p.style.strokeWidth=w+'px';p.setAttribute('stroke-linecap','butt');p.setAttribute('stroke-linejoin',i?'miter':'round');p.setAttribute('stroke-miterlimit','4');
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
 const hero=document.querySelector('.hero'), header=document.querySelector('header'), reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const runs=[...hero.querySelectorAll('h1 .type-line')].map(line=>{
  const text=line.textContent,run=document.createElement('span');run.className='word-run';line.setAttribute('aria-label',text);run.setAttribute('aria-hidden','true');
  const glyphs=[...text].map(c=>{const el=document.createElement('span');el.textContent=c;return el});run.append(...glyphs);line.replaceChildren(run);return {line,run,glyphs,ratio:0}
 });
 // Capture the resting advance in em; subsequent weight changes flow through the whole word.
 function calibrate(){for(const w of runs){w.glyphs.forEach(g=>{g.style.fontVariationSettings='"wght" 650';g.style.marginRight='';g.style.transform=''});
 const widths=w.glyphs.map(g=>g.offsetWidth),total=widths.reduce((a,b)=>a+b,0)||1;let pos=0;
 w.centres=widths.map(v=>{pos+=v;return (pos-v/2)/total});w.ratio=w.run.offsetWidth/parseFloat(getComputedStyle(w.line).fontSize)}}
 // ResizeObserver reports untransformed fractional advances without a synchronous layout read per frame.
 const observer=new ResizeObserver(entries=>{for(const e of entries){const w=runs.find(item=>item.run===e.target);if(w&&e.contentRect.width)w.run.style.transform='scaleX('+w.ratio*parseFloat(getComputedStyle(w.line).fontSize)/e.contentRect.width+')'}});
 calibrate();runs.forEach(w=>observer.observe(w.run));
 let variable=false;document.fonts.load('650 32px "Roboto Flex"','Joel Montgomery').then(f=>{variable=f.length>0;calibrate()}).catch(()=>{});
 const ns='http://www.w3.org/2000/svg',mk=(name,attrs)=>{const el=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el};
 const svg=mk('svg',{width:0,height:0,'aria-hidden':'true'});svg.style.position='absolute';const filter=mk('filter',{id:'ink-pull',filterUnits:'userSpaceOnUse',primitiveUnits:'userSpaceOnUse',x:-60,y:-60,'color-interpolation-filters':'sRGB'});
 // RGB encodes inverse sampling direction: outward sampling pulls visible ink inward.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=160;const ctx=canvas.getContext('2d'),im=ctx.createImageData(160,160);
 for(let y=0;y<160;y++)for(let x=0;x<160;x++){const a=(x-79.5)/80,b=(y-79.5)/80,r=Math.hypot(a,b),fall=.76*Math.max(0,1-r)**2+.24*Math.max(0,1-r*r)**2,swirl=1.8*fall,j=(160*y+x)*4;
 im.data.set([128+250*fall*(a-b*swirl),128+250*fall*(b+a*swirl),128,255],j)}
 ctx.putImageData(im,0,0);const map=mk('feImage',{href:canvas.toDataURL(),width:840,height:840,result:'field'});
 const warp=mk('feDisplacementMap',{in:'SourceGraphic',in2:'map',xChannelSelector:'R',yChannelSelector:'G',scale:0});
 filter.append(mk('feFlood',{'flood-color':'#808080',result:'neutral'}),map,mk('feComposite',{in:'field',in2:'neutral',operator:'over',result:'map'}),warp);
 svg.append(filter);document.body.append(svg);
 let point=null,aimX=0,aimY=0,x=0,y=0,power=0,phase=0,last=0,raf=0,visible=true,ready=false;
 function pointAt(clientX,clientY){if(reduced.matches)return;point=[clientX,clientY];if(!ready){[x,y]=point;[aimX,aimY]=point;ready=true}}
 header.addEventListener('pointermove',e=>{if(e.pointerType==='mouse')pointAt(e.clientX,e.clientY)},{passive:true});
 header.addEventListener('pointerleave',()=>point=null);
 // Listen without capturing or cancelling: Safari owns the scroll gesture.
 let touching=false;
 header.addEventListener('touchstart',e=>{touching=e.touches.length===1&&!e.target.closest('input,button,a');if(touching)pointAt(e.touches[0].clientX,e.touches[0].clientY)},{passive:true});
 header.addEventListener('touchmove',e=>{if(touching&&e.touches.length===1)pointAt(e.touches[0].clientX,e.touches[0].clientY);else point=null},{passive:true});
 const release=()=>{touching=false;point=null};
 header.addEventListener('touchend',release,{passive:true});header.addEventListener('touchcancel',release,{passive:true});
 function draw(now){raf=0;if(!visible||document.hidden||reduced.matches)return;
 const dt=Math.min(50,now-last);last=now;const progress=Number(document.querySelector('#playhead').value)/72;
 const remaining=1-progress*progress*(3-2*progress);phase+=dt*(.00036+.00164*remaining);
 for(const [row,w] of runs.entries()){
 const r=w.run.getBoundingClientRect();
 const dx=point?Math.max(r.left-point[0],0,point[0]-r.right):Infinity,dy=point?Math.max(r.top-point[1],0,point[1]-r.bottom):Infinity;
 const near=Math.exp(-.5*((dx/115)**2+(dy/100)**2));
 const radius=Math.max(18,r.height*.38),px=point?Math.max(r.left,Math.min(point[0],r.right)):0;
 const heat=w.centres.map(f=>near*Math.exp(-.5*((px-r.left-f*r.width)/radius)**2));
 const mean=heat.reduce((a,b)=>a+b,0)/heat.length;
 w.influence??=heat.map(()=>0);w.mix??=0;const ease=-Math.expm1(-dt/145);w.mix+=(near-w.mix)*ease;
 w.glyphs.forEach((g,j)=>{w.influence[j]+=(heat[j]-mean-w.influence[j])*ease;const bias=w.influence[j];const n=Math.sin(phase+j*.88+row+.28*Math.sin(phase*.63-j*.4));const width=99+39*Math.sin(.81*phase+j*1.17+row+.5);g.style.fontVariationSettings='"wght" '+(variable?Math.max(100,Math.min(1000,550+400*n*(1-.86*w.mix)+(bias<0?2800:1050)*bias)):650)+', "wdth" '+(variable?Math.max(50,Math.min(145,100+(width-100)*(1-.86*w.mix)+(bias<0?340:160)*bias)):100);g.style.letterSpacing=(-.035+.019*n)+'em'});
 // Stretch the ink as well as its advance; the run normalises back to its resting width.
 const advances=w.glyphs.map(g=>g.offsetWidth);
 w.glyphs.forEach((g,j)=>{const k=Math.max(.34,Math.min(2.8,Math.exp((w.influence[j]<0?3.4:1.72)*w.influence[j])));g.style.transform='scaleX('+k+')';g.style.marginRight=(advances[j]*(k-1))+'px'});

 }
 // Two first-order low-pass stages resist rapid reversals without spring overshoot.
 power+=((point?1:0)-power)*(-Math.expm1(-dt/(point?290:490)));
 if(power>.002 || point){
  const rect=hero.getBoundingClientRect();
  if(point){
   const a=-Math.expm1(-dt/125),b=-Math.expm1(-dt/180);
   aimX+=(point[0]-aimX)*a;aimY+=(point[1]-aimY)*a;
   x+=(aimX-x)*b;y+=(aimY-y)*b;
  }
  filter.setAttribute('width',rect.width+120);filter.setAttribute('height',rect.height+120);
  map.setAttribute('x',x-rect.left-420);map.setAttribute('y',y-rect.top-420);
  warp.setAttribute('scale',power*116);hero.style.filter='url(#ink-pull)';
 }else{hero.style.filter='';ready=false}
 raf=requestAnimationFrame(draw)}
 function sync(){cancelAnimationFrame(raf);hero.style.filter='';point=null;power=0;ready=false;last=performance.now();if(reduced.matches){for(const w of runs){w.run.style.transform='';w.glyphs.forEach(g=>g.removeAttribute('style'))}}else if(visible&&!document.hidden)raf=requestAnimationFrame(draw)}
 new IntersectionObserver(([e])=>{visible=e.isIntersecting;sync()}).observe(hero);reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
})();