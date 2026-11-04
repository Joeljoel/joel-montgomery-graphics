(() => {
 const $ = s => document.querySelector(s), reel=$('.reel'), mark=$('.hero .mark'), bio=$('.hero > div'), track=$('#playhead'), controls=$('.transport'), line=$('.traveller'), end=$('.signature');
 const reduce=matchMedia('(prefers-reduced-motion: reduce)');
 const clamp=x=>Math.max(0,Math.min(1,x)), ease=x=>x*x*(3-2*x);
 let frame=0,drag=false;
 function duration(){return Math.max(1,reel.offsetHeight-innerHeight*.35)}
 function draw(){
  frame=0;
  const on=!reduce.matches;
  document.body.classList.toggle('sequence',on);
  const p=clamp(scrollY/duration()), q=ease(clamp(p/.53)), t=ease(clamp((p-.28)/.72));
  mark.style.transform=on?'scale('+ (1+3.8*(1-q)) +') rotate('+(-12*(1-q))+'deg)':'';
  bio.style.opacity=on?String(.12+.88*q):'';
  controls.hidden=!on || (!drag && document.activeElement!==track && scrollY>duration()+80);
  track.value=Math.round(1000*p);
  controls.querySelector('output').textContent=String(Math.round(p*72)).padStart(2,'0')+' / 72';
  end.style.opacity=on && p<1?'0':'1';
  line.toggleAttribute("hidden",!on || p>=1);
  if(!line.hasAttribute("hidden")){
   const b=end.getBoundingClientRect(), w=document.documentElement.clientWidth;
   const mix=(a,b)=>a+(b-a)*t;
   Object.assign(line.style,{left:mix(-.14*w,b.left)+'px',top:mix(innerHeight*.42,b.top)+'px',width:mix(w*1.15,b.width)+'px',height:mix(innerHeight*.29,b.height)+'px'});
   line.style.opacity=String(clamp(p*8));
  }
 }
 function queue(){if(!frame)frame=requestAnimationFrame(draw)}
 track.oninput=()=>window.scrollTo(0,duration()*track.value/1000);
 track.onpointerdown=()=>{drag=true};window.addEventListener('pointerup',()=>{drag=false;queue()});
 track.onblur=queue;addEventListener('scroll',queue,{passive:true});addEventListener('resize',queue);reduce.addEventListener('change',queue);draw();
})();