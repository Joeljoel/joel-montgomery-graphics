const el=id=>document.getElementById(id);
const root=document.documentElement;
const query=new URLSearchParams(location.search);
const notes={flow:'The L and R labels mark the edges of normal page content.',fixed:'A fixed stripe now crosses the viewport and deliberately overshoots both sides. Scroll and watch its ends.',root:'The document itself now has stripes. Look for stripes behind the controls, not just a matching tint.'};
for(const id of ['bg','theme'])if(/^#[0-9a-f]{6}$/i.test(query.get(id)||''))el(id).value=query.get(id);
if(Object.hasOwn(notes,query.get('paint')))el('paint').value=query.get('paint');
el('safe').checked=query.get('safe')!=='0';
function refresh(){
 root.dataset.paint=el('paint').value;
 root.style.setProperty('--paper',el('bg').value);
 document.querySelector('meta[name=theme-color]').content=el('theme').value;
 el('paintNote').textContent=notes[root.dataset.paint];
 el('targets').classList.toggle('inset',el('safe').checked);
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
 const v=window.visualViewport,s=getComputedStyle(el('probe')),size=(w,h)=>Math.round(w)+' × '+Math.round(h);
 const rows={'Screen (CSS px)':size(screen.width,screen.height),'Layout viewport':size(root.clientWidth,root.clientHeight),'Visual viewport':v?size(v.width,v.height):'Unavailable','Safe area (T / R / B / L)':[s.paddingTop,s.paddingRight,s.paddingBottom,s.paddingLeft].join(' / '),'Viewport fit':fit};
 el('meters').replaceChildren(...Object.entries(rows).map(([k,v])=>{const row=document.createElement('div');for(const [tag,t] of [['dt',k],['dd',v]]){const node=document.createElement(tag);node.textContent=t;row.append(node)}return row}));
}
refresh();measure();window.addEventListener('resize',measure);window.visualViewport?.addEventListener('resize',measure);
