import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('css/portfolio.css');
const animation=read('js/title-sequence.js');
const overlayScript=read('js/ui-overlay.js');

test('the nav toggle is accessible and overlays cannot intercept links',()=>{
 assert.match(html, /id="ui-overlay-toggle"[^>]*aria-pressed="false"/);
 assert.match(html, /src="js\/ui-overlay\.js"/);
 assert.match(css, /\.sticky-bar #ui-overlay-toggle\{/);
 assert.match(css, /\.ui-card-overlay\{[^}]*pointer-events:none/);
 assert.match(css, /\.ui-overlay \.ui-card-overlay\{visibility:visible;opacity:1\}/);
 assert.match(css, /\.ui-overlay \.ui-footer-guide\{display:block\}/);
 assert.match(css, /\.ui-overlay #vectors,\.ui-overlay \.type-editor\{visibility:visible\}/);
 assert.match(animation, /attributeFilter:\['data-look','class'\]/);
 assert.match(animation, /classList\.contains\('editing'\)\|\|document\.body\.classList\.contains\('ui-overlay'\)/);
 assert.match(animation, /range\.addEventListener\('pointerdown',edit\)/);
});

test('UI mode reveals dynamic tile guides and returns to the clean view',()=>{
 const make=(name='div')=>{
  const attrs={},classes=new Set(),listeners={};
  const node={
   name,style:{},children:[],hidden:false,textContent:'',className:'',
   classList:{
    contains:c=>classes.has(c),
    toggle(c,force){const next=force===undefined?!classes.has(c):force;if(next)classes.add(c);else classes.delete(c);return next},
    remove:c=>classes.delete(c)
   },
   append(...children){node.children.push(...children)},
   setAttribute(k,v){attrs[k]=v},
   getAttribute:k=>attrs[k],
   addEventListener(type,fn){listeners[type]=fn},
   fire(type,evt={}){listeners[type]?.(evt)},
   getBoundingClientRect(){const r=node.rect||{left:0,top:0,width:0,height:0};return {...r,right:r.left+r.width,bottom:r.top+r.height}},
   matches(){return !!node.active}
  };
  return node;
 };
 const body=make('body'),button=make('button'),label=make('span');
 button.querySelector=()=>label;
 const cards=[0,1,2].map(i=>{
  const card=make('a'),x=100+i*360;
  card.rect={left:x,top:200,width:310,height:250};
  const art=make(),heading=make(),desc=make(),feature=make();
  art.rect={left:x,top:200,width:310,height:155};
  heading.rect={left:x+8,top:367,width:150,height:45};
  desc.rect={left:x+8,top:426,width:190,height:20};
  feature.rect={left:x+90,top:232,width:62,height:55};
  card.querySelector=s=>s==='.art'?art:s==='h3 .title-label'?heading:s==='p'?desc:feature;
  card.parts={art,heading,desc,feature};
  return card;
 });
 const footer=[make(),make()];
 const document={
  body,hidden:false,
  querySelector:q=>q==='#ui-overlay-toggle'?button:null,
  querySelectorAll:q=>q==='.work > a'?cards:q==='footer > div'?footer:[],
  createElement:make,
  addEventListener(){}
 };
 let raf=null,next=1;
 const requestAnimationFrame=fn=>{raf=fn;return next++};
 const cancelAnimationFrame=()=>{raf=null};
 const window={addEventListener(){}};
 new Function('document','window','requestAnimationFrame','cancelAnimationFrame','performance',
  overlayScript)(document,window,requestAnimationFrame,cancelAnimationFrame,{now:()=>1000});
 assert.equal(body.classList.contains('ui-overlay'),false);
 assert.equal(button.getAttribute('aria-pressed'),'false');
 assert.equal(label.textContent,'UI OFF');
 assert.equal(cards.every(c=>c.children.some(n=>n.className==='ui-card-overlay')),true);
 assert.equal(footer.every(f=>f.children.some(n=>n.className==='ui-footer-guide')),true);
 button.fire('click');
 assert.equal(body.classList.contains('ui-overlay'),true);
 assert.equal(button.getAttribute('aria-pressed'),'true');
 assert.equal(label.textContent,'UI ON');
 const root=cards[1].children.find(n=>n.className==='ui-card-overlay');
 const titleWire=root.children.find(n=>n.className==='ui-wire ui-wire-type');
 const artWire=root.children.find(n=>n.className==='ui-wire ui-wire-art');
 const featureWire=root.children.find(n=>n.className==='ui-wire ui-wire-feature');
 assert.equal(artWire.style.width,'310.00px');
 assert.equal(titleWire.style.left,'8.00px');
 assert.equal(featureWire.style.width,'62.00px');
 // Simulate the Echo title sliding and a tracked art feature shifting.
 cards[1].parts.heading.rect={...cards[1].parts.heading.rect,left:cards[1].rect.left+36,width:167};
 cards[1].parts.feature.rect={...cards[1].parts.feature.rect,left:cards[1].rect.left+114};
 const pending=raf;
 assert.equal(typeof pending,'function');
 pending(1050);
 assert.equal(titleWire.style.left,'36.00px');
 assert.equal(titleWire.style.width,'167.00px');
 assert.equal(featureWire.style.left,'114.00px');
 button.fire('click');
 assert.equal(body.classList.contains('ui-overlay'),false);
 assert.equal(button.getAttribute('aria-pressed'),'false');
 assert.equal(raf,null);
});
