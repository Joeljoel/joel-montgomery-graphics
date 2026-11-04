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
 nav.replaceWith(space);nav.className='sticky-bar';nav.setAttribute('aria-label','Main navigation');// Keep keyboard and screen-reader order aligned with the fixed nav's visual position.
 // The skip link stays first, followed by navigation, then the header controls.
 body.insertBefore(nav,header);
 // Paint Safari's out-of-layout strip on the root canvas itself. Its background
 // scrolls with the document, avoiding a separately positioned scroll follower.
 const sizeBackdrop=()=>root.style.setProperty('--header-paint-height',header.offsetHeight+'px');
 sizeBackdrop();new ResizeObserver(sizeBackdrop).observe(header);
 // Safari owns the side strip: provide a solid header theme for it to sample,
 // including when the header itself has scrolled away but its bubble remains.
 let theme=document.querySelector('meta[name="theme-color"]');
 if(!theme){theme=document.createElement('meta');theme.name='theme-color';document.head.append(theme)}
 function syncTheme(){
  const colour='#1727ab';
  root.style.backgroundColor=colour;
  theme.content=colour;
 }
 syncTheme();

 addEventListener('pageshow',syncTheme);
})();