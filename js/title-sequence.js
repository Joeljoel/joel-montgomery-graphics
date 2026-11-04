(() => {
 const q=s=>document.querySelector(s), strokes=[...document.querySelectorAll('#strokes path')], guides=[...document.querySelector('#vectors').children], range=q('#playhead'), btn=q('#play'), out=q('.transport output'), rm=matchMedia('(prefers-reduced-motion: reduce)');
 let frame=0,run=0,start=0;
 const lines=[...document.querySelectorAll('.type-line')];
 // The right-hand copy gets the same composition-guide treatment as the JM.
 // The overlay is purely presentational and appears only while scrubbing.
 const copy=document.querySelector('.hero > div:last-child');
 copy.classList.add('hero-copy');
 const textEditor=document.createElement('div');
 textEditor.className='type-editor';textEditor.setAttribute('aria-hidden','true');
 const labels=['03 / JOEL','04 / MONTGOMERY','05 / ROLE','06 / LOCATION'];
 const editBoxes=lines.map((_,i)=>{
  const box=document.createElement('div');
  box.className='type-edit-box'+(i<2?' is-heading':' is-caption');
  const label=document.createElement('small');label.className='type-edit-label';
  label.textContent=labels[i];box.append(label);
  for(let corner=0;corner<4;corner++){
   const handle=document.createElement('i');handle.className='type-edit-handle h'+corner;
   box.append(handle);
  }
  const pivot=document.createElement('b');pivot.className='type-edit-pivot';
  pivot.textContent='+';box.append(pivot);textEditor.append(box);
  return box;
 });
 copy.append(textEditor);
 const introEchoes=new Map(),introOffsets=[5,15,29,36],introSpans=[32,39,29,31];
 const introProgress=(i,f)=>burst((f-introOffsets[i])/introSpans[i]);
 const introX=(i,u)=>-(i<2?.34:.27)*(1-u);
 // Wait until the variable-font module builds the real word-run. Copies of its
 // glyphs inherit the same ink and full font styling, not a grey shadow layer.
 function ensureIntroEchoes(line,i){
  if(i>1)return [];
  if(introEchoes.has(line))return introEchoes.get(line);
  const real=line.querySelector('.word-run');
  if(!real)return [];
  const layer=document.createElement('span');
  layer.className='type-intro-echoes';layer.setAttribute('aria-hidden','true');
  const copies=Array.from({length:18},()=>{
   const echo=document.createElement('span');echo.className='type-intro-echo';
   const copiedRun=real.cloneNode(true);
   // A frozen clone holds the font axes and local transforms from the frame
   // when it was created. Bind each copied glyph to the live word's variables
   // so all Echo samples deform with the changing Roboto Flex lettering.
   copiedRun.style.transform='var(--intro-run-transform, none)';
   [...copiedRun.children].forEach((glyph,j)=>{
    const prefix='--intro-glyph-'+j+'-';
    glyph.style.fontVariationSettings='var('+prefix+'axes, "wght" 650)';
    glyph.style.letterSpacing='var('+prefix+'spacing, normal)';
    glyph.style.transform='var('+prefix+'scale, none)';
    glyph.style.marginRight='var('+prefix+'margin, 0px)';
   });
   echo.append(copiedRun);layer.append(echo);return echo;
  });
  line.append(layer);introEchoes.set(line,copies);return copies;
 }
 function updateTextBounds(i,line,u){
  if(!document.body.classList.contains('editing')&&!document.body.classList.contains('ui-overlay'))return;
  const box=editBoxes[i];box.hidden=u<=.015;
  if(box.hidden)return;
  const real=line.querySelector('.word-run');
  // Use the transformed glyph boxes: the word-run's layout rectangle may
  // include excess space while Joel's individual characters stretch.
  const glyphRects=real?[...real.children].map(g=>g.getBoundingClientRect()):[];
  let rect;
  if(glyphRects.length){
   const left=Math.min(...glyphRects.map(r=>r.left));
   const right=Math.max(...glyphRects.map(r=>r.right));
   const top=Math.min(...glyphRects.map(r=>r.top));
   const bottom=Math.max(...glyphRects.map(r=>r.bottom));
   rect={left,top,width:right-left,height:bottom-top};
  }else if(real)rect=real.getBoundingClientRect();
  else{
   const range=document.createRange();range.selectNodeContents(line);
   rect=range.getBoundingClientRect();
  }
  const parent=copy.getBoundingClientRect();
  const width=Math.max(2,rect.width*u);
  const left=rect.left-parent.left+(i===1?rect.width*(1-u):0);
  box.style.left=left.toFixed(2)+'px';
  box.style.top=(rect.top-parent.top).toFixed(2)+'px';
  box.style.width=width.toFixed(2)+'px';
  box.style.height=Math.max(12,rect.height).toFixed(2)+'px';
 }
 const ns='http://www.w3.org/2000/svg';
 const outlines=strokes.map(()=>{const p=document.createElementNS(ns,'path');p.setAttribute('stroke','#ffe6aa');p.setAttribute('stroke-width','1.2');q('#speed-ink').append(p);return p});
 // Layer names attach to their corresponding vector boxes and inherit the
 // mark's transforms, just like the J/M path controls.
 const jmLabels=guides.map((guide,i)=>{
  const layer=document.createElementNS(ns,'g');
  layer.setAttribute('class','vector-layer-name');
  layer.setAttribute('stroke','none');
  const bg=document.createElementNS(ns,'rect');
  bg.setAttribute('fill','#222631');
  const name=document.createElementNS(ns,'text');
  name.textContent=i?'02 / M':'01 / J';
  name.setAttribute('fill',i?'#ffbd77':'#75caff');
  name.setAttribute('stroke','none');
  name.setAttribute('font-family','monospace');
  name.setAttribute('font-weight','700');
  // JM is a large SVG: compensate for its viewport scale so these
  // labels resemble the 9px HTML typography-layer labels.
  name.setAttribute('font-size','5');
  layer.append(bg,name);guide.append(layer);
  return {bg,name};
 });
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
 // Use the same deformation for mouse and touch. Touch moves remain passive so
 // the surrounding header keeps its native scrolling and title-warp gestures.
 function aimAt(clientX){
  if(rm.matches)return;
  const b=mark.getBoundingClientRect();
  if(!b.width)return;
  target=Math.tanh((.39-(clientX-b.left)/b.width)*6);
  wake();
 }
 function releaseMark(){target=0;wake()}
 mark.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen')aimAt(e.clientX)});
 mark.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen')releaseMark()});
 mark.addEventListener('touchstart',e=>{if(e.touches.length===1)aimAt(e.touches[0].clientX)},{passive:true});
 mark.addEventListener('touchmove',e=>{if(e.touches.length===1)aimAt(e.touches[0].clientX)},{passive:true});
 mark.addEventListener('touchend',e=>{if(!e.touches.length)releaseMark()},{passive:true});
 mark.addEventListener('touchcancel',releaseMark,{passive:true});
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
 if(document.body.classList.contains('editing')||document.body.classList.contains('ui-overlay')){
 const [route,box,first,last,dot]=guides[i].children,points=Array.from({length:33},(_,j)=>p.getPointAtLength(len*u*j/32)),xs=points.map(v=>v.x),ys=points.map(v=>v.y),tip=points.at(-1);
 route.setAttribute('d',p.getAttribute('d'));const rect=(el,x,y,width,height)=>Object.entries({x,y,width,height}).forEach(([k,v])=>el.setAttribute(k,v));
 const minX=Math.min(...xs)-w/2,minY=Math.min(...ys)-w/2;
 rect(box,minX,minY,Math.max(...xs)-Math.min(...xs)+w,Math.max(...ys)-Math.min(...ys)+w);
 [first,last].forEach((el,j)=>{const v=p.getPointAtLength(j*len);rect(el,v.x-2,v.y-2,4,4)});
 dot.setAttribute('cx',tip.x);dot.setAttribute('cy',tip.y);
 const label=jmLabels[i],labelWidth=24,labelX=Math.max(0,Math.min(324-labelWidth,minX)),labelY=minY-10;
 rect(label.bg,labelX,labelY,labelWidth,8.5);
 label.name.setAttribute('x',labelX+2);label.name.setAttribute('y',labelY+6.2);
 }
 });
 lines.forEach((el,i)=>{
  const u=introProgress(i,frame),k=1-u;
  el.style.transformOrigin=i===1?'right':'left';
  const scale=1+(i===1?.32:-.24)*k;
  const position=introX(i,u);
  // Movement goes from LEFT to its resting position; the leading ink does
  // not overshoot or travel backwards.
  el.style.transform='translateX('+position.toFixed(4)+'em) scaleX('+scale+')';
  el.style.clipPath=u===1?'none':i===1
   ?'inset(-25% -3% -35% '+100*k+'%)'
   :'inset(-25% '+100*k+'% -35% -3%)';
  el.style.letterSpacing=(-.055+.09*k)+'em';
  el.style.opacity=clamp(u*4);
  // Apply the two ink highlights to the composited line, after the real
  // letters and every solid Echo sample have been combined. Text-shadow
  // inherits into each sample and creates unwanted colour between layers.
  el.style.textShadow='none';
  el.style.filter=k>.01
   ?'drop-shadow('+(-12*k)+'px 0 #ff8060) drop-shadow('+(8*k)+'px 0 #a5ffda)'
   :'none';
  // Eighteen solid past-position samples blend into a trailing stretch of
  // the letterforms while the line draws on. Scrubbing is deterministic:
  // every echo is computed from the requested composition frame.
  for(const [j,echo] of ensureIntroEchoes(el,i).entries()){
   const past=introProgress(i,frame-(j+1)*.6);
   const delta=introX(i,past)-position;
   echo.style.display=!rm.matches&&u>.025&&past>.015&&Math.abs(delta)>.003?'block':'none';
   echo.style.transform='translateX('+delta.toFixed(4)+'em)';
   echo.style.clipPath=i===1
    ?'inset(-25% -3% -35% '+100*(1-past)+'%)'
    :'inset(-25% '+100*(1-past)+'% -35% -3%)';
  }
  updateTextBounds(i,el,u);
 });
 document.querySelector('.tracks').style.setProperty('--time',100*frame/72+'%');range.value=Math.round(frame);out.value=String(Math.round(frame)).padStart(3,'0')+' / 72';
 }
 function stop(){cancelAnimationFrame(run);run=0;btn.textContent=frame>=72?'Replay':'Play'}
 function tick(now){draw((now-start)*.045);if(frame>=72)stop();else run=requestAnimationFrame(tick)}
 function play(){document.body.classList.remove('editing');if(frame>=72)draw(0);start=performance.now()-frame/.045;btn.textContent='Pause';run=requestAnimationFrame(tick)}
 function edit(){stop();document.body.classList.add('editing');draw(frame)}
 range.addEventListener('pointerdown',edit);range.oninput=()=>{const requested=Number(range.value);stop();document.body.classList.add("editing");draw(requested);stop()};btn.onclick=()=>run?stop():play();
 // The other animation loop continues changing glyph widths during scrubbing.
 // Keep the editing boxes in sync without restarting the intro timeline.
 q('.hero').addEventListener('header:letterforms-changed',()=>{
  if(!document.body.classList.contains('editing')&&!document.body.classList.contains('ui-overlay'))return;
  lines.slice(0,2).forEach((line,i)=>updateTextBounds(i,line,introProgress(i,frame)));
 });
 new MutationObserver(()=>draw(frame)).observe(document.body,{attributes:true,attributeFilter:['data-look','class']});
 q('.transport').hidden=false;draw(72);stop();if(!rm.matches)play();rm.onchange=()=>{draw(72);stop();document.body.classList.remove('editing')};
})();
(() => {
 const cards=[...document.querySelectorAll('.work > a')], looks=['tools','lab','basketball'],touch=matchMedia('(hover:none)');
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
  const text=line.textContent,run=document.createElement('span');run.className='word-run';line.setAttribute('aria-hidden','true');run.setAttribute('aria-hidden','true');
  const glyphs=[...text].map(c=>{const el=document.createElement('span');el.textContent=c;return el});run.append(...glyphs);line.replaceChildren(run);return {line,run,glyphs,ratio:0}
 });
 // Contextual typography labels are visible only in scrub/edit mode.
 // Their x positions are measured from transformed live glyphs each frame,
 // including individual width/weight changes and whole-word normalization.
 const nameHeading=hero.querySelector('h1'),nameContainer=hero.querySelector('.hero-copy');
 const glyphInspector=document.createElement('div');
 glyphInspector.className='glyph-inspector';
 glyphInspector.setAttribute('aria-hidden','true');
 glyphInspector.hidden=true;
 const glyphTags=Array.from({length:3},()=>{
  const tag=document.createElement('span'),label=document.createElement('span'),pin=document.createElement('i');
  tag.className='glyph-inspector-tag';label.className='glyph-inspector-name';
  pin.className='glyph-inspector-pin';tag.append(label,pin);glyphInspector.append(tag);
  return {tag,label,pin};
 });
 nameContainer.append(glyphInspector);
 let glyphPointer=null;
 const hideGlyphInspector=()=>{glyphInspector.hidden=true};
 function renderGlyphInspector(){
  if(!glyphPointer||!(document.body.classList.contains('editing')||document.body.classList.contains('ui-overlay'))||document.hidden){
   hideGlyphInspector();return;
  }
  const {x,y}=glyphPointer;
  let selected=null;
  for(const [row,w] of runs.entries()){
   const bounds=w.line.getBoundingClientRect();
   if(parseFloat(w.line.style.opacity||'1')<.15||y<bounds.top-4||y>bounds.bottom+4)continue;
   const rects=w.glyphs.map(g=>g.getBoundingClientRect());
   const left=Math.min(...rects.map(r=>r.left)),right=Math.max(...rects.map(r=>r.right));
   if(x<left-7||x>right+7)continue;
   let nearest=0,distance=Infinity;
   rects.forEach((r,i)=>{
    const gap=x<r.left?r.left-x:x>r.right?x-r.right:0;
    const score=gap*3+Math.abs(x-(r.left+r.right)/2);
    if(score<distance){distance=score;nearest=i}
   });
   selected={row,w,nearest,rects};break;
  }
  if(!selected){hideGlyphInspector();return}
  const {row,w,nearest,rects}=selected;
  const indices=[nearest-1,nearest,nearest+1].filter(i=>i>=0&&i<w.glyphs.length);
  const container=nameContainer.getBoundingClientRect();
  const positions=indices.map((index,i)=>{
   const rect=rects[index],entry=glyphTags[i];
   entry.label.textContent=String(row+3).padStart(2,'0')+'.'+String(index+1).padStart(2,'0')+' / '+w.glyphs[index].textContent.toUpperCase();
   entry.tag.classList.toggle('is-hovered',index===nearest);
   entry.tag.hidden=false;
   return {entry,center:(rect.left+rect.right)/2-container.left,top:rect.top-container.top};
  });
  glyphTags.forEach((item,i)=>{item.tag.hidden=i>=positions.length});
  glyphInspector.hidden=false;
  const gap=4,widths=positions.map(p=>p.entry.tag.offsetWidth),available=container.width;
  const lefts=positions.map((p,i)=>p.center-widths[i]/2);
  for(let i=1;i<lefts.length;i++)lefts[i]=Math.max(lefts[i],lefts[i-1]+widths[i-1]+gap);
  const right=lefts.at(-1)+widths.at(-1);
  if(right>available)for(let i=0;i<lefts.length;i++)lefts[i]-=right-available;
  if(lefts[0]<0)for(let i=0;i<lefts.length;i++)lefts[i]-=lefts[0];
  const top=Math.min(...positions.map(p=>p.top))-27;
  positions.forEach((p,i)=>{
   p.entry.tag.style.left=lefts[i].toFixed(2)+'px';
   p.entry.tag.style.top=top.toFixed(2)+'px';
   p.entry.pin.style.left=(p.center-lefts[i]).toFixed(2)+'px';
  });
 }
 nameHeading.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse'&&e.pointerType!=='pen')return;
  glyphPointer={x:e.clientX,y:e.clientY};renderGlyphInspector();
 },{passive:true});
 nameHeading.addEventListener('pointerleave',()=>{
  glyphPointer=null;hideGlyphInspector();
 });
 new MutationObserver(()=>{
  if(!document.body.classList.contains('editing')&&!document.body.classList.contains('ui-overlay'))hideGlyphInspector();
  else renderGlyphInspector();
 }).observe(document.body,{attributes:true,attributeFilter:['class']});
 addEventListener('resize',renderGlyphInspector,{passive:true});
 // Capture the resting advance in em; subsequent weight changes flow through the whole word.
 function calibrate(){for(const w of runs){w.glyphs.forEach((g,j)=>{
  g.style.fontVariationSettings='"wght" 650';g.style.marginRight='';g.style.transform='';
  // Also reset the Echo's shared values during initial font measurement and
  // when the variable font finishes loading, before live animation resumes.
  const prefix='--intro-glyph-'+j+'-';
  w.line.style.setProperty(prefix+'axes',g.style.fontVariationSettings);
  w.line.style.setProperty(prefix+'spacing',g.style.letterSpacing||'normal');
  w.line.style.setProperty(prefix+'scale','none');
  w.line.style.setProperty(prefix+'margin','0px');
 });
 const widths=w.glyphs.map(g=>g.offsetWidth),total=widths.reduce((a,b)=>a+b,0)||1;let pos=0;
 w.centres=widths.map(v=>{pos+=v;return (pos-v/2)/total});w.ratio=w.run.offsetWidth/parseFloat(getComputedStyle(w.line).fontSize)}}
 // Montgomery stays at its calibrated word width. Joel is free to change
 // width with its individual glyphs and only shrinks if it would extend beyond
 // Montgomery. Never enlarge Joel just to match its own initial width.
 function scaleForWord(w,currentWidth){
  const montgomery=runs[1];
  const maxWidth=montgomery.ratio*parseFloat(getComputedStyle(montgomery.line).fontSize);
  return w===runs[0]?Math.min(1,maxWidth/currentWidth):
   w.ratio*parseFloat(getComputedStyle(w.line).fontSize)/currentWidth;
 }
 // ResizeObserver supplies current untransformed advances as the letters vary.
 const letterformsChanged=new Event('header:letterforms-changed');
 const observer=new ResizeObserver(entries=>{for(const e of entries){
  const w=runs.find(item=>item.run===e.target);
  if(w&&e.contentRect.width){
   const normalization='scaleX('+scaleForWord(w,e.contentRect.width)+')';
   w.run.style.transform=normalization;
   // Echo copies use exactly the same width correction as the live lettering.
   w.line.style.setProperty('--intro-run-transform',normalization);
  }
 }
 // The width cap updates asynchronously: sync the box after normalization.
 if(document.body.classList.contains('editing')||document.body.classList.contains('ui-overlay'))hero.dispatchEvent(letterformsChanged);
 });
 calibrate();runs.forEach(w=>observer.observe(w.run));
 let variable=false;document.fonts.load('650 32px "Roboto Flex"','Joel Montgomery').then(f=>{variable=f.length>0;calibrate()}).catch(()=>{});
 // Moderated twisting for the header's cursor warp and dot field.
 // Font width/weight and interaction speed stay unchanged.
 const WARP_SWIRL=.9,WARP_STRENGTH=88,GRID_SWIRL=.5;
 const ns='http://www.w3.org/2000/svg',mk=(name,attrs)=>{const el=document.createElementNS(ns,name);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);return el};
 const svg=mk('svg',{width:0,height:0,'aria-hidden':'true'});svg.style.position='absolute';const filter=mk('filter',{id:'ink-pull',filterUnits:'userSpaceOnUse',primitiveUnits:'userSpaceOnUse',x:-60,y:-60,'color-interpolation-filters':'sRGB'});
 // RGB encodes inverse sampling direction: outward sampling pulls visible ink inward.
 const canvas=document.createElement('canvas');canvas.width=canvas.height=160;const ctx=canvas.getContext('2d'),im=ctx.createImageData(160,160);
 for(let y=0;y<160;y++)for(let x=0;x<160;x++){const a=(x-79.5)/80,b=(y-79.5)/80,r=Math.hypot(a,b),fall=.76*Math.max(0,1-r)**2+.24*Math.max(0,1-r*r)**2,swirl=WARP_SWIRL*fall,j=(160*y+x)*4;
 im.data.set([128+250*fall*(a-b*swirl),128+250*fall*(b+a*swirl),128,255],j)}
 ctx.putImageData(im,0,0);const map=mk('feImage',{href:canvas.toDataURL(),width:840,height:840,result:'field'});
 const warp=mk('feDisplacementMap',{in:'SourceGraphic',in2:'map',xChannelSelector:'R',yChannelSelector:'G',scale:0});
 filter.append(mk('feFlood',{'flood-color':'#808080',result:'neutral'}),map,mk('feComposite',{in:'field',in2:'neutral',operator:'over',result:'map'}),warp);
 svg.append(filter);document.body.append(svg);

 // Sparse, independently timed glyphs share the cursor field with the title.
 const grid=document.createElement('canvas');grid.className='motion-grid';grid.setAttribute('aria-hidden','true');header.prepend(grid);
 const gctx=grid.getContext('2d');let gridStep=40;let dots=[],gw=0,gh=0,ink='#faf6ea',inkTransitionUntil=0;
 function sizeGrid(){
  gw=header.clientWidth;gh=header.clientHeight;const dpr=Math.min(devicePixelRatio||1,1.5);
  grid.width=Math.round(gw*dpr);grid.height=Math.round(gh*dpr);gctx.setTransform(dpr,0,0,dpr,0,0);
  dots=[];const step=gridStep=Math.max(40,Math.sqrt(gw*gh/900));
  for(let yy=22;yy<gh;yy+=step)for(let xx=22;xx<gw;xx+=step)dots.push({x:xx,y:yy,from:0,to:0,start:0,next:performance.now()+1000+Math.random()*12000});
  ink=getComputedStyle(header).color;
 }
 function glyph(type,xx,yy,alpha){
  gctx.globalAlpha=alpha*.3;gctx.beginPath();
  if(type===0){gctx.arc(xx,yy,1.65,0,Math.PI*2);gctx.fill()}
  else if(type===1)gctx.fillRect(xx-2.6,yy-2.6,5.2,5.2);
  else if(type===2)gctx.strokeRect(xx-3,yy-3,6,6);
  else{gctx.moveTo(xx-3,yy-3);gctx.lineTo(xx+3,yy+3);gctx.moveTo(xx+3,yy-3);gctx.lineTo(xx-3,yy+3);gctx.stroke()}
 }

 // Tile illustrations use the same lattice and displacement as the dots.
 let motifLook=document.body.dataset.look||'',motifPrevious='',motifStart=performance.now();
 function motifPaths(look){
  const cols=Math.max(1,Math.floor((gw-44)/gridStep)),rows=Math.max(1,Math.floor((gh-44)/gridStep));
  const paths=[],add=p=>paths.push(p);
  const rect=(x,y,w,h)=>add([[x,y],[x+w,y],[x+w,y+h],[x,y+h],[x,y]]);
  let width=6,height=4;
  if(look==='lab'){
   const cell=cols>=14?2:1,gap=cols>=14?1:0;
   width=5*cell+4*gap;height=cell+1;
   for(let i=0;i<5;i++)rect(i*(cell+gap),0,cell,height);
  }else if(look==='basketball'){
   width=16;height=8;
   // Paired arcade backboard, with a raised crown and two separate baskets.
   add([[0,5],[0,1],[1,0],[15,0],[16,1],[16,5],[0,5]]);
   add([[1,2],[15,2]]);
   for(const x of [2,10]){
    rect(x,3,4,2);
    add([[x,5],[x+2,4.5],[x+4,5],[x+2,5.5],[x,5]]);
    add([[x,5],[x+1,8],[x+3,8],[x+4,5]]);
    add([[x+.5,6],[x+3,8],[x+3.5,6],[x+1,8],[x+.5,6]]);
   }
  }else if(look==='tools'){
   // Easil's three-part E, traced from tools/assets/easilLogo.png.
   // Keep the diagonal faces and original square proportions.
   width=8;height=8;
   add([[0,1.125],[2,0],[2,2.375],[0,3.375],[0,1.125]]);
   add([[0,3.625],[1.125,4.125],[5,1.875],[5,4.125],[3,5.375],
        [4,5.875],[4,8],[0,5.875],[0,3.625]]);
   add([[4.125,5.875],[8,3.625],[8,5.875],[4.125,8],[4.125,5.875]]);
  }else return [];
  // Desktop illustrations fill the composition rather than a small central patch.
  // Quantize every enlarged anchor back to the existing dot lattice.
  let sx=1,sy=1;
  if(gw>=800){
   if(look==='lab'){
    const cell=Math.max(2,Math.min(Math.floor((cols*.86-4)/5),Math.floor(rows*.65)));
    paths.length=0;width=cell*5+4;height=cell;
    for(let i=0;i<5;i++)rect(i*(cell+1),0,cell,cell);
   }else{
    // Uniform scaling avoids stretching logos or hoops.
    sx=sy=Math.max(.5,Math.min(cols*.84/width,rows*.72/height));
   }
  }
  const usedWidth=Math.round(width*sx),usedHeight=Math.round(height*sy);
  const ox=22+Math.max(0,Math.floor((cols-usedWidth)/2))*gridStep;
  const oy=22+Math.max(0,Math.floor((rows-usedHeight)/2))*gridStep;
  return paths.map(p=>p.map(([x,y])=>[ox+x*sx*gridStep,oy+y*sy*gridStep]));
 }
 function paintMotif(look,progress,opacity,cx,cy,strength){
  if(!look||opacity<=0)return;
  const paths=motifPaths(look);
  const warpPoint=([px,py])=>{
   const dx=cx-px,dy=cy-py,r=Math.hypot(dx,dy)/420;
   const fall=.76*Math.max(0,1-r)**2+.24*Math.max(0,1-r*r)**2;
   return [px+strength*fall*(dx-dy*fall*GRID_SWIRL)*.28,py+strength*fall*(dy+dx*fall*GRID_SWIRL)*.28];
  };
  gctx.save();gctx.lineWidth=1.25;gctx.lineJoin='round';gctx.lineCap='round';
  gctx.globalAlpha=opacity*.38;
  // Stagger individual strokes; sample long segments so they bend with the field.
  paths.forEach((path,index)=>{
   const spread=look==='lab'?.62:.48;
   const delay=index/Math.max(1,paths.length-1)*spread;
   const local=Math.max(0,Math.min(1,(progress-delay)/(1-spread)));
   const remaining=1-(1-local)**3;
   const lengths=path.slice(1).map((p,i)=>Math.hypot(p[0]-path[i][0],p[1]-path[i][1]));
   let budget=lengths.reduce((a,b)=>a+b,0)*remaining;
   gctx.beginPath();gctx.moveTo(...warpPoint(path[0]));
   for(let i=0;i<lengths.length&&budget>0;i++){
    const length=lengths[i],fraction=Math.min(1,budget/length),steps=Math.max(1,Math.ceil(length*fraction/8));
    for(let j=1;j<=steps;j++){
     const t=fraction*j/steps;
     gctx.lineTo(...warpPoint([path[i][0]+(path[i+1][0]-path[i][0])*t,path[i][1]+(path[i+1][1]-path[i][1])*t]));
    }
    budget-=length;
   }
   gctx.stroke();
  });
  gctx.restore();
 }
 function paintGrid(now,cx,cy,strength){
  if(now<inkTransitionUntil)ink=getComputedStyle(header).color;
  const bounds=header.getBoundingClientRect();cx-=bounds.left;cy-=bounds.top;
  gctx.clearRect(0,0,gw,gh);gctx.fillStyle=ink;gctx.strokeStyle=ink;gctx.lineWidth=1.1;
  const elapsed=reduced.matches?1:Math.min(1,(now-motifStart)/1500);
  paintMotif(motifPrevious,1,1-Math.min(1,elapsed*2.5),cx,cy,strength);
  paintMotif(motifLook,elapsed,Math.min(1,elapsed*3),cx,cy,strength);
  for(const d of dots){
   if(!reduced.matches&&now>d.next){d.from=d.to;d.to=d.to===0?1+Math.floor(Math.random()*3):0;d.start=now;d.next=now+(d.to?700+Math.random()*1900:3500+Math.random()*10000)}
   const t=reduced.matches?1:Math.min(1,(now-d.start)/180),mix=1-(1-t)**3;
   const dx=cx-d.x,dy=cy-d.y,r=Math.hypot(dx,dy)/420;
   const fall=.76*Math.max(0,1-r)**2+.24*Math.max(0,1-r*r)**2;
   const xx=d.x+strength*fall*(dx-dy*fall*GRID_SWIRL)*.28,yy=d.y+strength*fall*(dy+dx*fall*GRID_SWIRL)*.28;
   if(mix<1)glyph(d.from,xx,yy,1-mix);glyph(reduced.matches?0:d.to,xx,yy,mix);
  }
 }
 sizeGrid();new ResizeObserver(()=>{sizeGrid();paintGrid(performance.now(),0,0,0)}).observe(header);
 new MutationObserver(()=>{
  motifPrevious=motifLook;motifLook=document.body.dataset.look||'';motifStart=performance.now();
  inkTransitionUntil=performance.now()+550;ink=getComputedStyle(header).color;if(reduced.matches)paintGrid(performance.now(),0,0,0)}).observe(document.body,{attributes:true,attributeFilter:['data-look']});

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
 // Use the full Roboto Flex width (50–145) and weight (100–1000)
  // ranges instead of keeping idle glyphs inside them. Pointer interaction
  // redistributes weight/width locally without flattening most of the
  // independent letter animation.
  const activity=1-.36*w.mix;
  w.glyphs.forEach((g,j)=>{
   w.influence[j]+=(heat[j]-mean-w.influence[j])*ease;
   const bias=w.influence[j];
   const n=Math.sin(phase+j*.88+row+.28*Math.sin(phase*.63-j*.4));
   const wave=Math.sin(.81*phase+j*1.17+row+.5);
   const weight=variable?Math.max(100,Math.min(1000,550+450*n*activity+(bias<0?2700:1200)*bias)):650;
   const width=variable?Math.max(50,Math.min(145,97.5+47.5*wave*activity+(bias<0?340:185)*bias)):100;
   const axes='"wght" '+weight+', "wdth" '+width;
   const spacing=(-.035+.019*n)+'em';
   g.style.fontVariationSettings=axes;
   g.style.letterSpacing=spacing;
   // Share the current axes and tracking with all temporal Echo copies.
   w.line.style.setProperty('--intro-glyph-'+j+'-axes',axes);
   w.line.style.setProperty('--intro-glyph-'+j+'-spacing',spacing);
  });
  // Keep ink distortion proportional to the individual glyph advance.
  // Montgomery keeps its calibrated width. Joel can grow naturally,
  // with its final word transform capped by Montgomery's width.
  const advances=w.glyphs.map(g=>g.offsetWidth);
  w.glyphs.forEach((g,j)=>{
   const bias=w.influence[j];
   const k=Math.max(.28,Math.min(3.15,Math.exp((bias<0?3.75:1.92)*bias)));
   const scale='scaleX('+k+')';
   const margin=(advances[j]*(k-1))+'px';
   g.style.transform=scale;
   g.style.marginRight=margin;
   // Include the per-letter stretch and compensating advance, otherwise
   // the Echo can still pop off as soon as its timeline offset reaches zero.
   w.line.style.setProperty('--intro-glyph-'+j+'-scale',scale);
   w.line.style.setProperty('--intro-glyph-'+j+'-margin',margin);
  });

 }
 // Keep the name bounding boxes and hovered-glyph labels anchored to the
 // changing letterforms while the playhead is stopped in editing mode.
 if(document.body.classList.contains('editing')||document.body.classList.contains('ui-overlay'))hero.dispatchEvent(letterformsChanged);
 renderGlyphInspector();
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
  warp.setAttribute('scale',power*WARP_STRENGTH);hero.style.filter='url(#ink-pull)';
 }else{hero.style.filter='';ready=false}
 paintGrid(now,x,y,power);
 raf=requestAnimationFrame(draw)}
 function sync(){cancelAnimationFrame(raf);ink=getComputedStyle(header).color;paintGrid(performance.now(),0,0,0);hero.style.filter='';point=null;power=0;ready=false;last=performance.now();if(reduced.matches){for(const w of runs){w.run.style.transform='';w.glyphs.forEach(g=>g.removeAttribute('style'))}}else if(visible&&!document.hidden)raf=requestAnimationFrame(draw)}
 new IntersectionObserver(([e])=>{visible=e.isIntersecting;sync()}).observe(hero);reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
})();
/* Echo the header's changing glyph field behind the footer links.
   Give it its own animation lifecycle: the header pauses when scrolled away. */
(() => {
 const footer=document.querySelector('footer');
 if(!footer)return;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const canvas=document.createElement('canvas');
 canvas.className='motion-grid footer-motion-grid';
 canvas.setAttribute('aria-hidden','true');
 footer.prepend(canvas);
 const ctx=canvas.getContext('2d');
 if(!ctx)return;
 let dots=[],width=0,height=0,point=null,power=0,raf=0,last=0,visible=false;
 let x=0,y=0,ready=false,ink=getComputedStyle(footer).color,inkTransitionUntil=0;
 function size(){
  width=footer.clientWidth;height=footer.clientHeight;
  const dpr=Math.min(devicePixelRatio||1,1.5);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  dots=[];const step=Math.max(40,Math.sqrt(width*height/900)),now=performance.now();
  for(let yy=22;yy<height;yy+=step)for(let xx=22;xx<width;xx+=step)
   dots.push({x:xx,y:yy,from:0,to:0,start:0,next:now+1000+Math.random()*12000});
 }
 function glyph(type,xx,yy,alpha){
  ctx.globalAlpha=alpha*.21;ctx.beginPath();
  if(type===0){ctx.arc(xx,yy,1.65,0,Math.PI*2);ctx.fill()}
  else if(type===1)ctx.fillRect(xx-2.6,yy-2.6,5.2,5.2);
  else if(type===2)ctx.strokeRect(xx-3,yy-3,6,6);
  else{ctx.moveTo(xx-3,yy-3);ctx.lineTo(xx+3,yy+3);ctx.moveTo(xx+3,yy-3);ctx.lineTo(xx-3,yy+3);ctx.stroke()}
 }
 function draw(now){
  raf=0;if(!visible||document.hidden)return;
  const dt=Math.min(50,now-last);last=now;
  const rect=footer.getBoundingClientRect();
  if(point&&!reduced.matches){
   const ease=-Math.expm1(-dt/160);
   x+=(point[0]-rect.left-x)*ease;y+=(point[1]-rect.top-y)*ease;
  }else ready=false;
  power+=((point&&!reduced.matches?1:0)-power)*(-Math.expm1(-dt/(point?230:420)));
  ctx.clearRect(0,0,width,height);
  if(now<inkTransitionUntil)ink=getComputedStyle(footer).color;
  ctx.fillStyle=ink;ctx.strokeStyle=ink;ctx.lineWidth=1.1;
  for(const d of dots){
   if(!reduced.matches&&now>d.next){
    d.from=d.to;d.to=d.to===0?1+Math.floor(Math.random()*3):0;
    d.start=now;d.next=now+(d.to?700+Math.random()*1900:3500+Math.random()*10000);
   }
   const t=reduced.matches?1:Math.min(1,(now-d.start)/180),mix=1-(1-t)**3;
   const dx=x-d.x,dy=y-d.y,r=Math.hypot(dx,dy)/420;
   const fall=.76*Math.max(0,1-r)**2+.24*Math.max(0,1-r*r)**2;
   const xx=d.x+power*fall*(dx-dy*fall)*.28,yy=d.y+power*fall*(dy+dx*fall)*.28;
   if(mix<1)glyph(d.from,xx,yy,1-mix);
   glyph(reduced.matches?0:d.to,xx,yy,mix);
  }
  ctx.globalAlpha=1;
  if(!reduced.matches)raf=requestAnimationFrame(draw);
 }
 function sync(){
  cancelAnimationFrame(raf);raf=0;
  ink=getComputedStyle(footer).color;
  if(visible&&!document.hidden){last=performance.now();draw(last)}
 }
 function aim(clientX,clientY){
  if(reduced.matches)return;
  point=[clientX,clientY];
  if(!ready){const r=footer.getBoundingClientRect();x=clientX-r.left;y=clientY-r.top;ready=true}
  if(!raf)sync();
 }
 footer.addEventListener('pointermove',e=>{if(e.pointerType==='mouse'||e.pointerType==='pen')aim(e.clientX,e.clientY)},{passive:true});
 footer.addEventListener('pointerleave',()=>{point=null},{passive:true});
 footer.addEventListener('touchstart',e=>{if(e.touches.length===1)aim(e.touches[0].clientX,e.touches[0].clientY)},{passive:true});
 footer.addEventListener('touchmove',e=>{if(e.touches.length===1)aim(e.touches[0].clientX,e.touches[0].clientY)},{passive:true});
 const release=()=>{point=null};
 footer.addEventListener('touchend',release,{passive:true});
 footer.addEventListener('touchcancel',release,{passive:true});
 new MutationObserver(()=>{inkTransitionUntil=performance.now()+550;if(reduced.matches)sync()}).observe(document.body,{attributes:true,attributeFilter:['data-look']});
 new ResizeObserver(()=>{size();sync()}).observe(footer);
 new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;sync()}).observe(footer);
 reduced.addEventListener('change',()=>{point=null;power=0;sync()});
 document.addEventListener('visibilitychange',sync);
 size();sync();
})();
(() => {
 const brand=document.querySelector('.sticky-bar > a:first-child'),mark=brand.querySelector('b');
 const letters=['J','M'].map(letter=>{const span=document.createElement('span');span.textContent=letter;span.style.transformOrigin='left center';return span});
 mark.replaceChildren(...letters);mark.setAttribute('aria-hidden','true');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');let room=0,raf=0,last=0,time=0;
 const random=(min,max)=>min+Math.random()*(max-min);
 // Four independent timelines: each chooses its own destination and duration.
 const track=(min,max,value)=>({min,max,from:value,to:random(min,max),start:0,duration:random(3500,10000)});
 const controls=letters.map(()=>({width:track(50,400,100),weight:track(100,1000,700)}));
 function sample(control){
  if(time>=control.start+control.duration){
   control.from=control.to;control.to=random(control.min,control.max);
   control.start=time;control.duration=random(3500,10000);
  }
  const t=Math.min(1,(time-control.start)/control.duration),ease=t*t*t*(t*(t*6-15)+10);
  return control.from+(control.to-control.from)*ease;
 }
 function draw(now){
  raf=0;const dt=Math.min(50,now-last);last=now;if(!reduced.matches&&!document.hidden)time+=dt;
  const widths=controls.map(control=>reduced.matches?100:sample(control.width));
  letters.forEach((el,i)=>{
   const weight=reduced.matches?700:sample(controls[i].weight);
   el.style.fontVariationSettings='"wght" '+weight+', "wdth" '+Math.min(145,widths[i]);
   el.style.marginRight='0px';
  });
  const advances=letters.map(el=>el.offsetWidth);
  letters.forEach((el,i)=>{
   const stretch=Math.max(1,widths[i]/145);
   el.style.transform='scaleX('+stretch+')';
   el.style.marginRight=advances[i]*(stretch-1)+'px';
  });
  // Only compress the whole mark when it reaches the button's reserved space.
  mark.style.transform='scaleX('+Math.max(0,Math.min(1,room/(mark.offsetWidth||1)))+')';
  if(!document.hidden&&!reduced.matches)raf=requestAnimationFrame(draw);
 }
 function sync(){cancelAnimationFrame(raf);last=performance.now();draw(last)}
 new ResizeObserver(([e])=>{room=Math.max(0,e.contentRect.width-16);if(reduced.matches)sync()}).observe(brand);
 document.fonts.ready.then(sync);reduced.addEventListener('change',sync);document.addEventListener('visibilitychange',sync);sync();
})();


/* Solid-ink temporal echo for the featured titles, after the supplied AE Echo reference.
   The lead text only translates to the RIGHT on entry (no scale or skew).
   Closely-spaced samples of its actual previous positions form a continuous
   trailing ink smear, which catches up just after the lead finishes moving.
   Echo elements are decorative and never contribute to the word's layout. */
(() => {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const looks=['tools','lab','basketball'];
 // Subpixel-spaced, opaque previous frames overlap into a single solid silhouette.
 const enterDuration=385,exitDuration=470,spacing=7,echoCount=40,trailTime=spacing*echoCount;
 const cards=[...document.querySelectorAll('.work h3')].map((heading,i)=>{
  const label=heading.querySelector('.title-label');
  if(!label)return null;
  const layer=document.createElement('span');
  layer.className='title-echoes';layer.setAttribute('aria-hidden','true');
  const echoes=Array.from({length:echoCount},()=>{
   const echo=document.createElement('span');
   echo.className='title-echo';
   // Clone the entire heading content, including the vector arrow, so the
   // solid temporal trail remains visually identical to the leading title.
   echo.append(...Array.from(label.childNodes,node=>node.cloneNode(true)));
   layer.append(echo);
   return echo;
  });
  heading.append(layer);
  return {heading,label,echoes,look:looks[i],goal:0,
   moves:[{at:-100000,from:0,to:0,duration:exitDuration}],lastChanged:-100000,moveDuration:exitDuration};
 }).filter(Boolean);
 if(!cards.length)return;
 let raf=0,enabled=false;
 function positionAt(item,time){
  let move=item.moves[0];
  for(let i=item.moves.length-1;i>=0;i--){
   if(time>=item.moves[i].at){move=item.moves[i];break}
  }
  const t=Math.max(0,Math.min(1,(time-move.at)/(move.duration||exitDuration)));
  // On entry, launch immediately and settle into place. Keep the existing
  // symmetric ease-in/out on exit. Both curves remain monotonic.
  const entering=move.to>move.from;
  const ease=entering?1-Math.pow(1-t,3)
   :(t<.5?4*t*t*t:1-4*Math.pow(1-t,3));
  return move.from+(move.to-move.from)*ease;
 }
 function render(now){
  raf=0;if(!enabled||document.hidden)return;
  let stillMoving=false;
  for(const item of cards){
   const head=positionAt(item,now);
   item.label.style.transform='translate3d('+head.toFixed(3)+'px,0,0)';
   const oldest=positionAt(item,now-trailTime);
   const smeared=Math.abs(head-oldest)>.12;
   if(now-item.lastChanged<item.moveDuration+trailTime+80)stillMoving=true;
   for(let i=0;i<item.echoes.length;i++){
    const x=positionAt(item,now-(i+1)*spacing);
    const echo=item.echoes[i];
    // Every echo is fully opaque: adjacent samples physically merge into
    // one continuous ink shape, just like Echo's maximum compositing mode.
    echo.style.transform='translate3d('+x.toFixed(3)+'px,0,0)';
    echo.style.display=smeared?'block':'none';
   }
  }
  if(stillMoving)raf=requestAnimationFrame(render);
 }
 function wake(){if(enabled&&!raf&&!document.hidden)raf=requestAnimationFrame(render)}
 function update(){
  if(!enabled)return;
  const now=performance.now();
  let changed=false;
  for(const item of cards){
   const next=document.body.dataset.look===item.look?
    parseFloat(getComputedStyle(item.heading).fontSize)*.36:0;
   if(Math.abs(next-item.goal)<.1)continue;
   const from=positionAt(item,now);
   const duration=next>from?enterDuration:exitDuration;
   item.moves.push({at:now,from,to:next,duration});
   item.goal=next;item.moveDuration=duration;item.lastChanged=now;changed=true;
   // Only recent transitions are needed to reconstruct the echo window.
   item.moves=item.moves.filter((m,i)=>i===0||m.at>now-1600);
  }
  if(changed)wake();
 }
 function configure(){
  cancelAnimationFrame(raf);raf=0;enabled=!reduced.matches;
  for(const item of cards){
   item.heading.classList.toggle('title-echo-active',enabled);
   item.label.style.removeProperty('transform');
   item.echoes.forEach(echo=>{echo.style.display='none';echo.style.removeProperty('transform')});
   const target=enabled&&document.body.dataset.look===item.look?
    parseFloat(getComputedStyle(item.heading).fontSize)*.36:0;
   item.goal=target;item.moves=[{at:-100000,from:target,to:target,duration:exitDuration}];
   item.moveDuration=exitDuration;
   item.lastChanged=-100000;
   if(enabled)item.label.style.transform='translate3d('+target.toFixed(3)+'px,0,0)';
  }
 }
 new MutationObserver(update).observe(document.body,{
  attributes:true,attributeFilter:['data-look']
 });
 window.addEventListener('resize',()=>{
  if(!enabled)return;
  const now=performance.now();
  for(const item of cards){
   const next=document.body.dataset.look===item.look?
    parseFloat(getComputedStyle(item.heading).fontSize)*.36:0;
   item.goal=next;item.moves=[{at:-100000,from:next,to:next,duration:exitDuration}];
   item.moveDuration=exitDuration;
   item.label.style.transform='translate3d('+next.toFixed(3)+'px,0,0)';
   item.echoes.forEach(echo=>echo.style.display='none');
   item.lastChanged=now-exitDuration-trailTime;
  }
 },{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else wake()});
 reduced.addEventListener('change',configure);
 configure();
})();
