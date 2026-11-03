(() => {
 const body=document.body, cells=[...document.querySelectorAll('.letter')], keyboard=document.querySelector('.keys'), message=document.querySelector('#message'), modes=[...document.querySelectorAll('[data-mode]')],prizes=document.querySelector('#prizes');
 const keys=new Map(),states=['untested','absent','present','correct'];let busy=false;
 const improved=()=>body.classList.contains('improved'),active=()=>cells.filter(c=>!c.disabled);
 const sheet=document.querySelector('#resultSheet'),view=document.querySelector('#viewResult');
 function openResult(){if(!improved()||active().length||sheet.open)return;
 document.querySelector('#resultTitle').textContent=message.textContent||'Round complete';
 document.querySelector('#resultNote').textContent=document.querySelector('#roundKind').textContent+(document.querySelector('#streak').textContent?' · '+document.querySelector('#streak').textContent:'');document.querySelector('#copied').textContent='';sheet.showModal()}
 view.onclick=openResult;document.querySelector('#again').onclick=()=>{sheet.close();prizes.querySelector('[onclick]').click()};
 function refresh(){document.querySelector('#roundKind').textContent=puzzleURL.includes('random=1')?'Random puzzle':'Daily puzzle';
 document.querySelector('#roundCount').textContent=active().length?'Guess '+guessNumber+' / 6':'Round complete';
 const ranks=new Map();for(const cell of cells){const l=cell.value.toUpperCase();if(!cell.disabled||!l)continue;const rank=cell.classList.contains('correct')?3:cell.classList.contains('present')?2:1;ranks.set(l,Math.max(rank,ranks.get(l)||0));cell.dataset.state=states[rank]}
 for(const [k,b] of keys){b.dataset.state=states[ranks.get(k)||0];b.setAttribute('aria-label',k+', '+b.dataset.state)}}
 for(const row of ['QWERTYUIOP','ASDFGHJKL','✓ZXCVBNM⌫']){const wrap=document.createElement('div');wrap.className='keyrow';for(const k of row){const b=document.createElement('button');b.type='button';b.textContent=k==='✓'?'Enter':k;if(k==='✓'||k==='⌫'){b.className='wide';b.setAttribute('aria-label',k==='✓'?'Submit guess':'Delete letter')}else keys.set(k,b);b.onclick=()=>{document.querySelector(".game").focus({preventScroll:true});input(k)};wrap.append(b)}keyboard.append(wrap)}
 function mode(value){if(value==="legacy")document.querySelector(".confetti")?.remove();body.classList.toggle('improved',value==='improved');modes.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===value)));cells.forEach((c,i)=>{c.readOnly=improved();c.setAttribute('aria-label','Guess '+(1+Math.floor(i/5))+', letter '+(i%5+1))});refresh()}
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
 async function input(k){const row=active();if(!improved()||busy||!row.length)return;const empty=row.find(c=>!c.value);row.forEach(c=>c.classList.remove('invalidWord'));
 if(k==='⌫'){const c=row.filter(c=>c.value).pop();if(c){c.value=''}message.textContent='';return}
 if(k!=='✓'){if(empty){empty.value=k;message.textContent=''}return}
 if(empty){message.textContent='Enter five letters.';return}
 if(!correctWord){message.textContent=puzzleState==='loading'?'Puzzle is still loading.':'Use Retry to load the puzzle.';return}
 busy=true;message.textContent='Checking…';const word=row.map(c=>c.value).join('').toLowerCase();try{const response=await fetch('https://words.dev-apis.com/validate-word',{method:'POST',signal:AbortSignal.timeout(10000),body:JSON.stringify({word})});if(!response.ok)throw Error();if(!(await response.json()).validWord){message.textContent='Word not recognised.';return}
 message.textContent='';finishGuess(word,row);submitted=cells.filter(c=>c.disabled&&c.value).map(c=>c.value.toLowerCase()).join('').match(/.{5}/g)||[];save()
 }catch{message.textContent='Couldn’t check that word. Try again.'}finally{busy=false}}
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
(() => {
 const root=document.documentElement, vv=window.visualViewport;
 if(!/\biPhone\b/.test(navigator.userAgent)||!navigator.maxTouchPoints)return;
 function size(){
  const gap=screen.width-root.clientWidth, active=document.body.classList.contains('improved')&&gap>=40&&gap<=240;
  root.toggleAttribute('data-joeldle-duo',active);
  root.toggleAttribute('data-zoomed',(vv?.scale||1)>1.01);
  if(active && !root.hasAttribute('data-zoomed')){
   root.style.setProperty('--side',gap+'px');
   root.style.setProperty('--glass-height',screen.height+'px');
   root.style.setProperty('--usable-height',(vv?.height||innerHeight)+'px');
  }
 }
 size();new MutationObserver(size).observe(document.body,{attributes:true,attributeFilter:['class']});
 window.addEventListener('resize',size);vv?.addEventListener('resize',size);
})();