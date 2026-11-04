/* Optional production-overlay view for the portfolio. Decorative layers
   follow live rendered artwork and typography but never capture pointer input. */
(() => {
 const button=document.querySelector('#ui-overlay-toggle');
 if(!button)return;
 const body=document.body;
 const cards=[...document.querySelectorAll('.work > a')];
 const specs=[
  {name:'DESIGN UTILITIES',subject:'.wave svg > g:nth-of-type(22) .disc',feature:'INK / RIBBON'},
  {name:'JOELDLE',subject:'.wordboard b:nth-child(3)',feature:'GLYPH / 03'},
  {name:'JOELSKETBALL',subject:'.hoopboard .hoop-ball',feature:'BALL / FLIGHT'}
 ];
 const create=(tag,cls,text)=>{
  const node=document.createElement(tag);node.className=cls;
  if(text!==undefined)node.textContent=text;
  return node;
 };
 const wire=(kind,label)=>{
  const frame=create('div','ui-wire ui-wire-'+kind);
  frame.append(create('span','ui-wire-label',label));
  for(const corner of ['tl','tr','bl','br'])frame.append(create('i','ui-wire-handle ui-corner-'+corner));
  if(kind==='feature')frame.append(create('span','ui-wire-target','+'));
  return frame;
 };
 const layers=cards.map((card,i)=>{
  const spec=specs[i];
  const root=create('div','ui-card-overlay');
  root.setAttribute('aria-hidden','true');
  const art=card.querySelector('.art'),heading=card.querySelector('h3 .title-label'),desc=card.querySelector('p');
  const code=String(i+7).padStart(2,'0');
  const artWire=wire('art',code+'.01 / MEDIA');
  const typeWire=wire('type',code+'.02 / TITLE');
  const copyWire=wire('copy',code+'.03 / COPY');
  const featureWire=wire('feature',code+'.04 / '+spec.feature);
  const stage=create('div','ui-stage');
  stage.append(create('strong','ui-stage-title','COMP '+code+' / '+spec.name));
  const state=create('span','ui-stage-state','READY  •  IDLE');
  stage.append(state);
  const bars=create('div','ui-stage-timeline');
  for(let n=0;n<3;n++)bars.append(create('i','ui-stage-bar'));
  const playhead=create('b','ui-stage-playhead');
  bars.append(playhead);stage.append(bars);
  const position=create('span','ui-stage-position','X 000 · Y 000');
  stage.append(position);
  root.append(artWire,typeWire,copyWire,featureWire,stage);
  card.append(root);
  const feature=card.querySelector(spec.subject);
  return {card,art,heading,desc,feature,artWire,typeWire,copyWire,featureWire,stage,state,position,playhead};
 });
 const footers=[...document.querySelectorAll('footer > div')];
 footers.forEach((section,i)=>{
  const guide=create('div','ui-footer-guide');
  guide.setAttribute('aria-hidden','true');
  guide.append(create('span','ui-footer-caption',String(i+10).padStart(2,'0')+' / '+(i?'EXPERIMENTS':'TOOLS')+' · LINKS'));
  for(const corner of ['tl','tr','bl','br'])guide.append(create('i','ui-wire-handle ui-corner-'+corner));
  section.append(guide);
 });
 let raf=0,last=0;
 const place=(frame,rect,origin)=>{
  if(!rect||!rect.width||!rect.height){frame.hidden=true;return}
  frame.hidden=false;
  frame.style.left=(rect.left-origin.left).toFixed(2)+'px';
  frame.style.top=(rect.top-origin.top).toFixed(2)+'px';
  frame.style.width=rect.width.toFixed(2)+'px';
  frame.style.height=rect.height.toFixed(2)+'px';
 };
 function draw(now){
  raf=0;if(!body.classList.contains('ui-overlay')||document.hidden)return;
  if(now-last<28){raf=requestAnimationFrame(draw);return}
  last=now;
  for(const layer of layers){
   const origin=layer.card.getBoundingClientRect();
   const artRect=layer.art.getBoundingClientRect();
   place(layer.artWire,artRect,origin);
   place(layer.typeWire,layer.heading.getBoundingClientRect(),origin);
   place(layer.copyWire,layer.desc.getBoundingClientRect(),origin);
   if(layer.feature){
    const rect=layer.feature.getBoundingClientRect();
    // Keep geometry guides inside the artboard as the artwork animates.
    const left=Math.max(rect.left,artRect.left),right=Math.min(rect.right,artRect.right);
    const top=Math.max(rect.top,artRect.top),bottom=Math.min(rect.bottom,artRect.bottom);
    if(right>left&&bottom>top)place(layer.featureWire,{left,top,width:right-left,height:bottom-top},origin);
    else layer.featureWire.hidden=true;
    layer.position.textContent='X '+String(Math.round((rect.left+rect.width/2-artRect.left)/artRect.width*480)).padStart(3,'0')+
     ' · Y '+String(Math.round((rect.top+rect.height/2-artRect.top)/artRect.height*240)).padStart(3,'0');
   }else layer.featureWire.hidden=true;
   layer.stage.style.left=(artRect.right-origin.left-10).toFixed(2)+'px';
   layer.stage.style.top=(artRect.top-origin.top+10).toFixed(2)+'px';
   const active=layer.card.matches(':hover,:focus-within');
   layer.card.classList.toggle('ui-card-active',active);
   layer.state.textContent=active?'KEYFRAMES  •  ACTIVE':'READY  •  IDLE';
   layer.playhead.style.left=active?'78%':'17%';
  }
  raf=requestAnimationFrame(draw);
 }
 function start(){
  cancelAnimationFrame(raf);raf=0;
  if(body.classList.contains('ui-overlay')){last=0;draw(performance.now())}
  else cards.forEach(card=>card.classList.remove('ui-card-active'));
 }
 function toggle(force){
  const on=typeof force==='boolean'?force:!body.classList.contains('ui-overlay');
  body.classList.toggle('ui-overlay',on);
  button.setAttribute('aria-pressed',String(on));
  button.setAttribute('aria-label',on?'Hide composition UI across the homepage':'Show composition UI across the homepage');
  button.querySelector('.ui-toggle-text').textContent=on?'UI ON':'UI OFF';
  start();
 }
 button.addEventListener('click',()=>toggle());
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(raf);raf=0}else start()});
 window.addEventListener('resize',()=>{if(body.classList.contains('ui-overlay'))start()},{passive:true});
 // Do not persist this opt-in across page loads: normal view is the default.
 toggle(false);
})();
