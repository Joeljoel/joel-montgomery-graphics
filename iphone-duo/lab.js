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
 return navigator.maxTouchPoints > 0 && gap > 0 && gap <= 240 ? gap : 0;
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
