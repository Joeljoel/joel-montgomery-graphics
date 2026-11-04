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
 // Use the original navigation once, in a persistent inset bubble.
 const header=document.querySelector('body > header'),nav=header.querySelector('nav');
 const space=document.createElement('div');space.className='nav-space';space.setAttribute('aria-hidden','true');
 nav.replaceWith(space);nav.className='sticky-bar';nav.setAttribute('aria-label','Main navigation');body.append(nav);
})();