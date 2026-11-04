(() => {
 const root=document.documentElement,body=document.body,vv=window.visualViewport;
 let orientation='',side=0;
 function update(){
  if((vv?.scale||1)>1.01)return;
  const next=matchMedia('(orientation:portrait)').matches?'portrait':'landscape';
  if(next!==orientation){orientation=next;side=0}
  const gap=screen.width-root.clientWidth;
  if(/\biPhone\b/i.test(navigator.userAgent)&&navigator.maxTouchPoints&&gap>=40&&gap<=240)side=gap;
  root.style.setProperty('--strip',side+'px');
  root.toggleAttribute('data-side-strip',side>0);
 }
 update();addEventListener('resize',update);addEventListener('pageshow',update);
 // A compact navigation bar stays in the viewport and inherits the active tile's palette.
 const header=document.querySelector('body > header'),nav=header.querySelector('nav').cloneNode(true);
 nav.className='sticky-bar';nav.setAttribute('aria-label','Sticky navigation');nav.inert=true;
 const brand=nav.querySelector('a');brand.className='sticky-brand';
 const name=document.createElement('span');name.textContent='Joel Montgomery';brand.append(name);
 body.append(nav);
 let raf=0,threshold=0;
 function paint(){raf=0;const show=scrollY>threshold;
  if(body.hasAttribute('data-sticky')!==show){body.toggleAttribute('data-sticky',show);nav.inert=!show}}
 function queue(){if(!raf)raf=requestAnimationFrame(paint)}
 new ResizeObserver(()=>{threshold=header.querySelector("nav").offsetTop+header.querySelector("nav").offsetHeight+24;queue()}).observe(header);
 addEventListener('scroll',queue,{passive:true});addEventListener('pageshow',queue);queue();
})();