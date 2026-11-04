(() => {
 const body=document.body, cells=[...document.querySelectorAll('.letter')], keyboard=document.querySelector('.keys'), message=document.querySelector('#message'), modes=[...document.querySelectorAll('[data-mode]')],prizes=document.querySelector('#prizes');
 document.querySelector('.game').addEventListener('pointerdown',e=>{if(body.classList.contains('improved')&&e.target.matches('input'))e.preventDefault()});
 const keys=new Map(),states=['untested','absent','present','correct'];let busy=false;
 const improved=()=>body.classList.contains('improved'),active=()=>cells.filter(c=>!c.disabled);
 const sheet=document.querySelector('#resultSheet'),view=document.querySelector('#viewResult');
 let resetTimer=0;
 function updateReset(){
  const now=new Date(),midnight=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1);
  const minutes=Math.ceil((midnight-now.getTime())/60000);
  const text='Resets in '+String(Math.floor(minutes/60)).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
  const label=document.querySelector('#nextPuzzle');if(label.textContent!==text)label.textContent=text;
 }
 sheet.addEventListener('close',()=>{clearInterval(resetTimer);resetTimer=0});
 document.addEventListener('visibilitychange',()=>{if(sheet.open)updateReset()});
 function openResult(){if(!improved()||active().length||sheet.open)return;
 document.querySelector('#resultTitle').textContent=message.textContent||'Round complete';
 document.querySelector('#resultNote').textContent=document.querySelector('#roundKind').textContent+(document.querySelector('#streak').textContent?' · '+document.querySelector('#streak').textContent:'');document.querySelector('#copied').textContent='';updateReset();sheet.showModal();clearInterval(resetTimer);resetTimer=setInterval(updateReset,1000)}
 view.onclick=openResult;document.querySelector('#again').onclick=()=>{sheet.close();prizes.querySelector('[onclick]').click()};
 function refresh(){document.querySelector('#roundKind').textContent=puzzleURL.includes('random=1')?'Random puzzle':'Daily puzzle';
 const done=!active().length;body.classList.toggle('round-ended',done);view.hidden=!done;document.querySelector('#roundCount').textContent=done?message.textContent:'Guess '+guessNumber+' / 6';
 const ranks=new Map();for(const cell of cells){const l=cell.value.toUpperCase();if(!cell.disabled||!l)continue;const rank=cell.classList.contains('correct')?3:cell.classList.contains('present')?2:1;ranks.set(l,Math.max(rank,ranks.get(l)||0));cell.dataset.state=states[rank]}
 for(const [k,b] of keys){b.dataset.state=states[ranks.get(k)||0];b.setAttribute('aria-label',k+', '+b.dataset.state)}}
 for(const row of ['QWERTYUIOP','ASDFGHJKL','✓ZXCVBNM⌫']){const wrap=document.createElement('div');wrap.className='keyrow';for(const k of row){const b=document.createElement('button');b.type='button';b.textContent=k==='✓'?'Enter':k;if(k==='✓'||k==='⌫'){b.className='wide';b.setAttribute('aria-label',k==='✓'?'Submit guess':'Delete letter')}else keys.set(k,b);b.onclick=()=>input(k);b.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse")e.preventDefault()});wrap.append(b)}keyboard.append(wrap)}
 function mode(value){if(value==="legacy")document.querySelector(".confetti")?.remove();body.classList.toggle('improved',value==='improved');modes.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===value)));cells.forEach((c,i)=>{c.readOnly=improved();c.tabIndex=improved()?-1:0;c.setAttribute('aria-label','Guess '+(1+Math.floor(i/5))+', letter '+(i%5+1))});refresh()}
 modes.forEach(b=>b.onclick=()=>{if(!busy){mode(b.dataset.mode);try{localStorage.setItem('joeldle-mode',b.dataset.mode)}catch{}}});
 let initial='improved';try{if(localStorage.getItem('joeldle-mode')==='legacy')initial='legacy'}catch{}mode(initial);
 function score(word,answer){const result=Array(5).fill('absent'),stock={};for(let i=0;i<5;i++){if(word[i]===answer[i])result[i]='correct';else stock[answer[i]]=(stock[answer[i]]||0)+1}for(let i=0;i<5;i++)if(result[i]==='absent'&&stock[word[i]]){stock[word[i]]--;result[i]='present'}return result}
 // Store submitted daily guesses only. Re-score against today's answer on reload.
 const saveKey='joeldle.daily.v1';let submitted=[];
 function puzzleID(){let h=5381;for(const c of correctWord)h=((h*33)^c.charCodeAt(0))>>>0;return new Date().toISOString().slice(0,10)+':'+h}
 function save(){if(!puzzleURL.includes('random'))try{localStorage.setItem(saveKey,JSON.stringify({id:puzzleID(),words:submitted}))}catch{}}
 let clearCelebration=()=>{};
 function celebrate(row){
  clearCelebration();
  const reduce=matchMedia('(prefers-reduced-motion: reduce)');
  if(reduce.matches)return;
  const layer=document.createElement('div');layer.className='confetti';layer.setAttribute('aria-hidden','true');
  const box=row[0].parentElement.getBoundingClientRect();
  for(let i=0;i<48;i++){
   const piece=document.createElement('i'),side=i%2?1:-1;
   piece.style.left=(side===1?box.left:box.right)+'px';piece.style.top=(box.top+box.height/2)+'px';
   for(const [key,value] of Object.entries({dx:side*(24+Math.random()*150)+'px',rise:-(55+Math.random()*140)+'px',fall:(55+Math.random()*95)+'px',spin:(side*(120+Math.random()*400))+'deg',delay:(320+Math.random()*160)+'ms',ink:['#77e7bf','#ffc959','#9386ff','#39acbf'][i%4]}))piece.style.setProperty('--'+key,value);
   layer.append(piece);
  }
  document.body.append(layer);row.forEach(c=>c.classList.add('winning'));
  const timer=setTimeout(()=>clearCelebration(),2100);
  clearCelebration=()=>{clearTimeout(timer);layer.remove();row.forEach(c=>c.classList.remove('winning'));reduce.removeEventListener('change',clearCelebration);clearCelebration=()=>{}};
  reduce.addEventListener('change',clearCelebration);
 }
 function finishGuess(word,row,animate=true){
  score(word,correctWord).forEach((state,i)=>{row[i].value=word[i].toUpperCase();row[i].classList.toggle('revealed',animate);row[i].style.setProperty('--order',i);if(state!=='absent')row[i].classList.add(state)});
  if(word===correctWord){endGame();victory();if(animate)celebrate(row)}else if(guessNumber===6){endGame();defeat()}else{guessNumber++;nextLine()}refresh();if(!active().length)setTimeout(openResult,animate&&word===correctWord?1900:0)
 }
 function restore(){submitted=[];if(!improved()||puzzleURL.includes('random')||guessNumber!==1||cells.some(c=>c.value))return;
  try{const data=JSON.parse(localStorage.getItem(saveKey));if(!data||data.id!==puzzleID()||!Array.isArray(data.words)||data.words.length>6||!data.words.every(w=>typeof w==='string'&&/^[a-z]{5}$/.test(w)))return;
   for(const word of data.words){const row=active();if(row.length!==5)break;finishGuess(word,row,false);submitted.push(word)}
  }catch{}
 }
 document.addEventListener('puzzle-ready',restore);if(puzzleState==='ready')restore();
 async function input(k){const row=active();if(!improved()||busy||!row.length)return;document.querySelector('#checking').textContent='';const empty=row.find(c=>!c.value);row.forEach(c=>c.classList.remove('invalidWord'));
 if(k==='⌫'){const c=row.filter(c=>c.value).pop();if(c){c.value=''}message.textContent='';return}
 if(k!=='✓'){if(empty){empty.value=k;message.textContent=''}return}
 if(empty){message.textContent='Enter five letters.';return}
 if(!correctWord){message.textContent=puzzleState==='loading'?'Puzzle is still loading.':'Use Retry to load the puzzle.';return}
 busy=true;message.textContent='';document.querySelector('#checking').textContent='Checking…';const word=row.map(c=>c.value).join('').toLowerCase();try{const response=await fetch('https://words.dev-apis.com/validate-word',{method:'POST',signal:AbortSignal.timeout(10000),body:JSON.stringify({word})});if(!response.ok)throw Error();if(!(await response.json()).validWord){document.querySelector('#checking').textContent='Not a Word';return}
 message.textContent='';finishGuess(word,row);submitted=cells.filter(c=>c.disabled&&c.value).map(c=>c.value.toLowerCase()).join('').match(/.{5}/g)||[];save()
 }catch{message.textContent='Couldn’t check that word. Try again.'}finally{busy=false;const status=document.querySelector('#checking');if(status.textContent==='Checking…')status.textContent=''}}
 document.addEventListener('keydown',e=>{if(sheet.open||!improved()||e.metaKey||e.ctrlKey||e.altKey||e.isComposing)return;if(e.target.closest('button,a')&&e.key==='Enter')return;let k=e.key==='Enter'?'✓':e.key==='Backspace'?'⌫':/^[a-z]$/i.test(e.key)?e.key.toUpperCase():null;if(k){e.preventDefault();e.stopImmediatePropagation();input(k)}},true);
 document.querySelector('#retry').onclick=()=>{message.textContent='';loadPuzzle(puzzleURL)};
 prizes.addEventListener('click',e=>{if(!e.target.closest('[onclick]'))return;clearCelebration();cells.forEach(c=>{delete c.dataset.state;c.classList.remove('revealed')});refresh()});
 document.querySelector('.copy-result').onclick=async()=>{
 const rows=[...document.querySelectorAll('.game .row')].filter(r=>r.children[0].disabled&&r.children[0].value);
 const grid=rows.map(r=>[...r.children].map(c=>c.classList.contains('correct')?'🟩':c.classList.contains('present')?'🟨':'⬛').join('')).join('\n');
 const won=rows.at(-1)&&[...rows.at(-1).children].every(c=>c.classList.contains('correct'));
 const result='Joeldle · '+document.querySelector('#roundKind').textContent+' '+(won?rows.length:'X')+'/6\n'+grid;
 try{await navigator.clipboard.writeText(result);document.querySelector('#copied').textContent='Result copied.'}catch{window.prompt('Copy your result:',result)}
 };
})();
// Keep geometry stable while Safari shows/hides its toolbar or a user pinches.
(() => {
 const root=document.documentElement,body=document.body,vv=window.visualViewport;
 let orientation='',side=0;
 function size(){
  if((vv?.scale||1)>1.01)return;
  const next=matchMedia('(orientation:portrait)').matches?'portrait':'landscape';
  if(next!==orientation){orientation=next;side=0}
  const gap=screen.width-root.clientWidth;
  if(/\biPhone\b/.test(navigator.userAgent)&&navigator.maxTouchPoints&&gap>=40&&gap<=240)side=gap;
  root.toggleAttribute('data-joeldle-duo',body.classList.contains('improved')&&side>0);
  root.style.setProperty('--side',side+'px');
  root.style.setProperty('--glass-height','100lvh');
 }
 size();new MutationObserver(size).observe(body,{attributes:true,attributeFilter:['class']});
 addEventListener('resize',size);addEventListener('pageshow',size);
})();
(() => {
 const root=document.documentElement,body=document.body,vv=window.visualViewport;
 let raf=0;
 function check(){
  raf=0;if((vv?.scale||1)>1.01)return;
  const height=vv?.height||innerHeight;
  const bottom=Math.max(0,...Array.from(body.children)
   .filter(el=>el.matches('header,nav,.game,.keys,.round-info,.fetch-info,#message,#streak,#prizes')&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden')
   .map(el=>el.getBoundingClientRect().bottom+scrollY));
  const fits=body.classList.contains('improved')&&bottom+parseFloat(getComputedStyle(body).paddingBottom)<=height+(root.hasAttribute('data-board-fits')?2:0);
  if(root.hasAttribute('data-board-fits')!==fits)root.toggleAttribute('data-board-fits',fits);
 }
 function queue(){if(!raf)raf=requestAnimationFrame(check)}
 // Geometry changes only: no observer work for every key state or confetti frame.
 const ro=new ResizeObserver(queue);for(const el of body.children)if(el.matches('header,nav,.game,.keys,.round-info,.fetch-info,#message,#streak,#prizes'))ro.observe(el);
 new MutationObserver(queue).observe(body,{attributes:true,attributeFilter:['class']});
 vv?.addEventListener('resize',queue);addEventListener('resize',queue);addEventListener('pageshow',queue);queue();
})();
