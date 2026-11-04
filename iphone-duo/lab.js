const el=id=>document.getElementById(id);
const root=document.documentElement;
const query=new URLSearchParams(location.search);
const header = document.querySelector('header');
function sizeHeader() {
 root.style.setProperty('--header-height', header.getBoundingClientRect().height + 'px');
}
sizeHeader();
new ResizeObserver(sizeHeader).observe(header, {box: 'border-box'});
// Place colour changes in document coordinates so they scroll with the sections.
const bands = [...document.querySelectorAll('[data-band]')];
function measureBands() {
 if (!['bands','edge','panorama'].includes(root.dataset.paint)) return;
 root.style.setProperty('--edge-height', document.body.getBoundingClientRect().height + 'px');
 const origin = root.getBoundingClientRect().top;
 const stops = bands.map(band => {
  const box = band.getBoundingClientRect();
  return band.dataset.band + ' ' + (box.top - origin) + 'px ' + (box.bottom - origin) + 'px';
 });
 root.style.setProperty('--section-bands', 'linear-gradient(to bottom, ' + stops.join(', ') + ')');
}
const bandObserver = new ResizeObserver(measureBands);
for (const part of [header, ...bands]) bandObserver.observe(part, {box: 'border-box'});
function edgeWidth() {
 const gap = screen.width - root.clientWidth;
 return /\biPhone\b/i.test(navigator.userAgent) && navigator.maxTouchPoints > 0 && gap >= 40 && gap <= 240 ? gap : 0;
}
function updateEdge() {
 const w = edgeWidth();
 root.toggleAttribute('data-edge-active', ['edge','panorama'].includes(root.dataset.paint) && w > 0);
 root.toggleAttribute('data-zoomed', (window.visualViewport?.scale || 1) > 1.01);
 root.style.setProperty('--edge-width', w + 'px');
 root.style.setProperty('--edge-phase', -(root.clientWidth % 96) + 'px');
}
const notes={panorama:'Follow the mountain ridge and the setting sun across the right edge of the header. Both come from one image.',edge:'A decorative column extends the document beyond the layout edge. Compare with Section colours and watch the far-right margin.',bands:'Compare the plum, rust and teal bands on both sides of the page edge. The gold rule marks the bottom of the header.',header:'Only the header-height band is painted on the document. Below its gold edge, the side strip should return to the page background.',flow:'The L and R labels mark the edges of normal page content.',fixed:'A fixed stripe now crosses the viewport and deliberately overshoots both sides. Scroll and watch its ends.',root:'The document itself now has stripes. Look for stripes behind the controls, not just a matching tint.'};
for(const id of ['bg','theme'])if(/^#[0-9a-f]{6}$/i.test(query.get(id)||''))el(id).value=query.get(id);
if(Object.hasOwn(notes,query.get('paint')))el('paint').value=query.get('paint');
el('safe').checked=query.get('safe')!=='0';
function refresh(){
 root.dataset.paint=el('paint').value;
 updateEdge();
 root.style.setProperty('--paper',el('bg').value);
 document.querySelector('meta[name=theme-color]').content=el('theme').value;
 el('paintNote').textContent=notes[root.dataset.paint];
 el('targets').classList.toggle('inset',el('safe').checked);
 measureBands();
 for(const a of document.querySelectorAll('nav a')){
  const url=new URL(a.href);
  for(const id of ['bg','theme','paint'])url.searchParams.set(id,el(id).value);
  url.searchParams.set('safe',el('safe').checked?'1':'0');a.href=url.href;
  if(url.searchParams.get('fit')===fit)a.setAttribute('aria-current','page');
 }
}
for(const id of ['bg','theme','safe','paint'])el(id).addEventListener('input',refresh);
let hits=0;
el('targets').addEventListener('click',e=>{if(e.target.matches('button'))el('hits').textContent=e.target.textContent+' · '+(++hits)});
function measure(){
 updateEdge();
 const v=window.visualViewport,s=getComputedStyle(el('probe')),size=(w,h)=>Math.round(w)+' × '+Math.round(h);
 const rows={'Screen (CSS px)':size(screen.width,screen.height),'Layout viewport':size(root.clientWidth,root.clientHeight),'Visual viewport':v?size(v.width,v.height):'Unavailable','Safe area (T / R / B / L)':[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft].join(' / '),'Extension width':(root.hasAttribute('data-edge-active') ? edgeWidth() : 0)+' CSS px','Viewport fit':fit};
 el('meters').replaceChildren(...Object.entries(rows).map(([k,v])=>{const row=document.createElement('div');for(const [tag,t] of [['dt',k],['dd',v]]){const node=document.createElement(tag);node.textContent=t;row.append(node)}return row}));
}
refresh();measure();window.addEventListener('resize',measure);window.visualViewport?.addEventListener('resize',measure);

;
// Optional APIs: lack of support must remain "unknown", never "flat".
(() => {
 const queries=Object.fromEntries(Object.entries({
  folded:'(device-posture: folded)',continuous:'(device-posture: continuous)',
  h1:'(horizontal-viewport-segments: 1)',h2:'(horizontal-viewport-segments: 2)',
  v1:'(vertical-viewport-segments: 1)',v2:'(vertical-viewport-segments: 2)'
 }).map(([key,q])=>[key,matchMedia(q)]));
 const probes=[];
 for(const [x,y] of [[0,0],[1,0],[0,1],[1,1]]){
  const p=document.createElement('div');p.className='segment-probe';
  for(const key of ['width','height','left','top'])
   p.style.setProperty('--'+key,'env(viewport-segment-'+key+' '+x+' '+y+', -1px)');
  document.body.append(p);probes.push(p);
 }
 function classifyPose(posture,horizontal,vertical,count){
  if(posture==='folded')return ['Partly folded — reported by Safari',
   horizontal?'Side-by-side segments: book-style layout.':vertical?'Stacked segments: laptop-style layout.':'Safari reports folded, but segment direction is unavailable.'];
  if(posture==='continuous')return ['Continuous — reported by Safari','This does not distinguish fully open from the outer display.'];
  if(horizontal||vertical||count>1)return ['Possible half-folded pose — inferred',
   (horizontal?'Side-by-side segments detected. ':vertical?'Stacked segments detected. ':'Multiple segments detected. ')+
   'Device Posture is unavailable; segment geometry alone cannot confirm the physical pose.'];
  return ['Pose unknown','Safari is not exposing a folded state or multiple segments in this window. Try folding, rotating, or opening Safari across the full inner screen.'];
 }
 let previous='',lastStatus='';
 function read(){
  if(document.hidden)return;
  let posture=null;
  try{posture=navigator.devicePosture?.type||null}catch{}
  if(!posture)posture=queries.folded.matches?'folded':queries.continuous.matches?'continuous':null;
  let rectangles=[],source='Unavailable';
  try{
   const raw=window.viewport?.segments||window.visualViewport?.segments;
   if(raw){rectangles=Array.from(raw,r=>({left:r.left,top:r.top,width:r.width,height:r.height}));source='JavaScript'}
  }catch{}
  if(!rectangles.length){
   rectangles=probes.map(p=>{const c=getComputedStyle(p);return Object.fromEntries(['left','top','width','height'].map(k=>[k,parseFloat(c.getPropertyValue('--'+k))]))})
    .filter(r=>r.width>0&&r.height>0&&r.left>=0&&r.top>=0);
   if(rectangles.length)source='CSS environment variables';
  }
  rectangles=rectangles.filter(r=>Object.values(r).every(Number.isFinite)&&r.width>0&&r.height>0);
  const horizontal=queries.h2.matches||(rectangles.length>1&&new Set(rectangles.map(r=>r.left)).size>1);
  const vertical=queries.v2.matches||(rectangles.length>1&&new Set(rectangles.map(r=>r.top)).size>1);
  const [status,detail]=classifyPose(posture,horizontal,vertical,rectangles.length);
  if(status!==lastStatus){el('pose-status').textContent=status;lastStatus=status}
  el('pose-detail').textContent=detail;
  const readings={
   'Device Posture JS':('devicePosture' in navigator)?(posture||'Exposed, no value'):'Not exposed',
   'Posture CSS':queries.folded.matches?'folded':queries.continuous.matches?'continuous':'No matching state',
   'Segment CSS':queries.h2.matches?'2 horizontal':queries.v2.matches?'2 vertical':queries.h1.matches||queries.v1.matches?'1 segment':'No matching state',
   'Segment rectangles':source+' · '+rectangles.length,
   'Layout viewport':root.clientWidth+' × '+root.clientHeight
  };
  rectangles.forEach((r,i)=>readings['Segment '+(i+1)]=Math.round(r.width)+' × '+Math.round(r.height)+' at '+Math.round(r.left)+', '+Math.round(r.top));
  const signature=JSON.stringify(readings);
  if(signature===previous)return;previous=signature;
  el('pose-readings').replaceChildren(...Object.entries(readings).map(([k,v])=>{
   const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
   dt.textContent=k;dd.textContent=v;row.append(dt,dd);return row;
  }));
  const map=el('segment-map');map.replaceChildren();map.hidden=!rectangles.length;
  if(rectangles.length){
   const width=Math.max(...rectangles.map(r=>r.left+r.width)),height=Math.max(...rectangles.map(r=>r.top+r.height));
   map.style.aspectRatio=width+'/'+height;
   rectangles.forEach((r,i)=>{const box=document.createElement('span');box.textContent=String(i+1);
    Object.assign(box.style,{left:r.left/width*100+'%',top:r.top/height*100+'%',width:r.width/width*100+'%',height:r.height/height*100+'%'});map.append(box)});
  }
  const item=document.createElement('li');item.textContent=new Date().toLocaleTimeString()+' — '+status+'; '+readings['Segment CSS'];
  el('pose-history').prepend(item);while(el('pose-history').children.length>8)el('pose-history').lastChild.remove();
 }
 Object.values(queries).forEach(q=>q.addEventListener('change',read));
 navigator.devicePosture?.addEventListener?.('change',read);
 addEventListener('resize',read);addEventListener('pageshow',read);
 window.visualViewport?.addEventListener('resize',read);
 document.addEventListener('visibilitychange',read);
 // Some experimental implementations change segment values without an event.
 setInterval(read,500);read();
})();
