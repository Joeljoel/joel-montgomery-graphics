import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('css/portfolio.css');
const animation=read('js/title-sequence.js');
const overlayScript=read('js/ui-overlay.js');

test('orange glass toggle sits left of Selected Work and preserves manual scrub',()=>{
 const nav=html.match(/<nav>[\s\S]*?<\/nav>/)?.[0];
 assert.ok(nav);
 assert.ok(nav.indexOf('id="ui-overlay-toggle"')<nav.indexOf('href="#work"'));
 assert.match(nav,/id="ui-overlay-toggle"[^>]*aria-pressed="false"/);
 assert.match(html,/src="js\/ui-overlay\.js"/);
 assert.match(css,/\.sticky-bar #ui-overlay-toggle\{/);
 assert.match(css,/font:inherit;letter-spacing:inherit/);
 assert.match(css,/#a95729b5/);
 assert.match(css,/backdrop-filter:blur\(9px\) saturate\(160%\)/);
 assert.match(css,/#ui-overlay-toggle\[data-phase=dark\]::before/);
 assert.match(css,/transform:scaleX\(var\(--ui-phase-progress,0\)\)/);
 assert.doesNotMatch(css,/\.ui-screen-wash/);
 assert.doesNotMatch(overlayScript,/ui-screen-wash|body\.append\(wash\)/);
 assert.match(css,/\.ui-card-overlay\{[^}]*pointer-events:none/);
 assert.match(css,/\.ui-overlay \.ui-card-overlay\{visibility:visible;opacity:1\}/);
 assert.match(css,/\.ui-overlay \.ui-footer-guide\{display:block\}/);
 assert.match(css,/\.ui-overlay #vectors,\.ui-overlay \.type-editor\{visibility:visible\}/);
 assert.match(css,/\.ui-wire-disc\{/);
 assert.match(animation,/attributeFilter:\['data-look','class'\]/);
 assert.match(animation,/classList\.contains\('editing'\)\|\|document\.body\.classList\.contains\('ui-overlay'\)/);
 assert.match(animation,/range\.addEventListener\('pointerdown',edit\)/);
});

function buildOverlay(){
 const make=(name='div')=>{
  const attrs={},classes=new Set(),listeners={};
  const node={
   name,style:{setProperty(k,v){this[k]=v}},dataset:{},children:[],hidden:false,textContent:'',className:'',
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
   getBoundingClientRect(){
    const r=node.rect||{left:0,top:0,width:0,height:0};
    return {...r,right:r.left+r.width,bottom:r.top+r.height};
   },
   matches(){return !!node.active},
   querySelector(s){
    if(s==='.ui-wire-label')return node.children.find(n=>n.className==='ui-wire-label');
    return null;
   },
   querySelectorAll(){return []}
  };
  return node;
 };
 const body=make('body'),button=make('button'),label=make('span');
 button.querySelector=s=>s==='.ui-toggle-text'?label:null;
 const cards=[0,1,2].map(i=>{
  const card=make('a'),x=100+i*360;
  card.rect={left:x,top:200,width:310,height:250};
  const art=make(),heading=make(),desc=make(),feature=make();
  art.rect={left:x,top:200,width:310,height:155};
  heading.rect={left:x+8,top:367,width:150,height:45};
  desc.rect={left:x+8,top:426,width:190,height:20};
  feature.rect={left:x+90,top:232,width:62,height:55};
  const discs=i===0?[0,1,2].map(j=>{
   const d=make('g');d.rect={left:x+40+j*32,top:235,width:45,height:72};return d;
  }):[];
  card.querySelector=s=>s==='.art'?art:s==='h3 .title-label'?heading:s==='p'?desc:
   s==='.ui-card-overlay'?card.children.find(n=>n.className==='ui-card-overlay'):feature;
  card.querySelectorAll=s=>s==='.wave .disc'?discs:[];
  card.parts={art,heading,desc,feature,discs};
  return card;
 });
 const footer=[make(),make()];
 const document={
  body,hidden:false,
  querySelector:q=>q==='#ui-overlay-toggle'?button:null,
  querySelectorAll:q=>q==='.work > a'?cards:q==='footer > div'?footer:[],
  createElement:make,
  addEventListener(type,fn){this['on'+type]=fn}
 };
 let raf=null,nextId=1,now=1000;
 const requestAnimationFrame=fn=>{raf=fn;return nextId++};
 const cancelAnimationFrame=()=>{raf=null};
 const window={addEventListener(){}};
 new Function('document','window','requestAnimationFrame','cancelAnimationFrame','performance',
  overlayScript)(document,window,requestAnimationFrame,cancelAnimationFrame,{now:()=>now});
 const tick=time=>{
  now=time;
  const fn=raf;
  assert.equal(typeof fn,'function','an animation frame should be scheduled');
  raf=null;fn(time);
 };
 const press=()=>button.fire('click');
 return {body,button,label,cards,footer,document,tick,press,
  setTime(value){now=value},getRaf(){return raf},
  wash:body.children.find(n=>n.className==='ui-screen-wash')};
}

test('button-only fill automatically cycles OFF light, ON dark every 10 seconds',()=>{
 const ui=buildOverlay(),{body,button,label,footer,cards}=ui;
 assert.equal(body.classList.contains('ui-overlay'),false);
 assert.equal(button.getAttribute('aria-pressed'),'false');
 assert.equal(button.dataset.phase,'light');
 assert.equal(button.style['--ui-phase-progress'],'0');
 assert.equal(label.textContent,'UI OFF');
 assert.equal(cards.every(c=>c.children.some(n=>n.className==='ui-card-overlay')),true);
 assert.equal(footer.every(f=>f.children.some(n=>n.className==='ui-footer-guide')),true);
 assert.equal(body.children.some(n=>n.className==='ui-screen-wash'),false);
 // The first timer starts on page load with no manual interaction.
 ui.tick(6000);
 assert.equal(body.classList.contains('ui-overlay'),false);
 assert.equal(button.style['--ui-phase-progress'],'0.5');
 ui.tick(11000);
 assert.equal(body.classList.contains('ui-overlay'),true);
 assert.equal(button.dataset.phase,'dark');
 assert.equal(button.getAttribute('aria-pressed'),'true');
 assert.equal(button.style['--ui-phase-progress'],'0');
 assert.equal(label.textContent,'UI ON');
 const root=cards[1].children.find(n=>n.className==='ui-card-overlay');
 const titleWire=root.children.find(n=>n.className==='ui-wire ui-wire-type');
 const featureWire=root.children.find(n=>n.className==='ui-wire ui-wire-feature');
 assert.equal(titleWire.style.left,'8.00px');
 assert.equal(featureWire.style.width,'62.00px');
 // Artwork bounds still follow the moving title and feature.
 cards[1].parts.heading.rect={...cards[1].parts.heading.rect,left:cards[1].rect.left+36,width:167};
 cards[1].parts.feature.rect={...cards[1].parts.feature.rect,left:cards[1].rect.left+114};
 ui.tick(16000);
 assert.equal(titleWire.style.left,'36.00px');
 assert.equal(titleWire.style.width,'167.00px');
 assert.equal(featureWire.style.left,'114.00px');
 assert.equal(button.style['--ui-phase-progress'],'0.5');
 ui.tick(21000);
 assert.equal(body.classList.contains('ui-overlay'),false);
 assert.equal(button.dataset.phase,'light');
 assert.equal(button.getAttribute('aria-pressed'),'false');
 assert.equal(button.style['--ui-phase-progress'],'0');
 assert.equal(label.textContent,'UI OFF');
 ui.tick(26000);
 assert.equal(button.style['--ui-phase-progress'],'0.5');
 ui.tick(31000);
 assert.equal(body.classList.contains('ui-overlay'),true);
 assert.equal(button.dataset.phase,'dark');
 // User clicks remain available and reset whichever countdown is running.
 ui.setTime(33000);
 ui.press();
 assert.equal(body.classList.contains('ui-overlay'),false);
 assert.equal(button.dataset.phase,'light');
 assert.equal(button.style['--ui-phase-progress'],'0');
 ui.tick(38000);
 assert.equal(button.style['--ui-phase-progress'],'0.5');
 ui.tick(43000);
 assert.equal(body.classList.contains('ui-overlay'),true);
 assert.equal(button.dataset.phase,'dark');
});

test('each ribbon disc gets its own animated bounding box only while hovered',()=>{
 const ui=buildOverlay();
 ui.press();
 const card=ui.cards[0];
 const root=card.children.find(n=>n.className==='ui-card-overlay');
 const frame=root.children.find(n=>n.className==='ui-wire ui-wire-disc');
 assert.ok(frame);
 assert.equal(frame.hidden,true);
 const second=card.parts.discs[1];
 second.fire('pointerenter',{pointerType:'mouse'});
 ui.tick(1050);
 assert.equal(frame.hidden,false);
 assert.equal(frame.style.left,'72.00px');
 assert.equal(frame.style.width,'45.00px');
 assert.equal(frame.querySelector('.ui-wire-label').textContent,'07.05 / DISC 02');
 second.rect={...second.rect,left:second.rect.left+20,width:56};
 ui.tick(1100);
 assert.equal(frame.style.left,'92.00px');
 assert.equal(frame.style.width,'56.00px');
 second.fire('pointerleave');
 ui.tick(1150);
 assert.equal(frame.hidden,true);
 // A pen behaves like a mouse, but touch does not create hover overlays.
 const third=card.parts.discs[2];
 third.fire('pointerenter',{pointerType:'touch'});
 ui.tick(1200);
 assert.equal(frame.hidden,true);
 third.fire('pointerenter',{pointerType:'pen'});
 ui.tick(1250);
 assert.equal(frame.querySelector('.ui-wire-label').textContent,'07.05 / DISC 03');
 ui.press();
 assert.equal(ui.body.classList.contains('ui-overlay'),false);
 assert.equal(frame.hidden,true);
});

test('hidden tab pauses the countdown; manual clicks restart the cycle',()=>{
 const ui=buildOverlay();
 ui.tick(6000);
 ui.document.hidden=true;
 ui.setTime(6000);ui.document.onvisibilitychange();
 ui.setTime(26000);ui.document.hidden=false;ui.document.onvisibilitychange();
 // Time spent hidden does not advance the initial 10-second OFF countdown.
 assert.equal(ui.body.classList.contains('ui-overlay'),false);
 assert.equal(ui.button.dataset.phase,'light');
 assert.equal(ui.button.style['--ui-phase-progress'],'0.5');
 ui.tick(31000);
 assert.equal(ui.body.classList.contains('ui-overlay'),true);
 assert.equal(ui.button.dataset.phase,'dark');
 ui.setTime(33000);ui.press();
 assert.equal(ui.body.classList.contains('ui-overlay'),false);
 assert.equal(ui.button.dataset.phase,'light');
 ui.tick(43000);
 assert.equal(ui.body.classList.contains('ui-overlay'),true);
 // A throttled frame catches up in complete ten-second intervals.
 ui.tick(73000);
 assert.equal(ui.body.classList.contains('ui-overlay'),false);
 assert.equal(ui.button.dataset.phase,'light');
});
