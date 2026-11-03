(() => {
 const body=document.body, cells=[...document.querySelectorAll('.letter')], keyboard=document.querySelector('.keys'), message=document.querySelector('#message'), modes=[...document.querySelectorAll('[data-mode]')],prizes=document.querySelector('#prizes');
 const keys=new Map(),states=['untested','absent','present','correct'];let busy=false;
 const improved=()=>body.classList.contains('improved'),active=()=>cells.filter(c=>!c.disabled);
 function refresh(){const ranks=new Map();for(const cell of cells){const l=cell.value.toUpperCase();if(!cell.disabled||!l)continue;const rank=cell.classList.contains('correct')?3:cell.classList.contains('present')?2:1;ranks.set(l,Math.max(rank,ranks.get(l)||0));cell.dataset.state=states[rank]}
 for(const [k,b] of keys){b.dataset.state=states[ranks.get(k)||0];b.setAttribute('aria-label',k+', '+b.dataset.state)}}
 for(const row of ['QWERTYUIOP','ASDFGHJKL','✓ZXCVBNM⌫']){const wrap=document.createElement('div');wrap.className='keyrow';for(const k of row){const b=document.createElement('button');b.type='button';b.textContent=k==='✓'?'Enter':k;if(k==='✓'||k==='⌫'){b.className='wide';b.setAttribute('aria-label',k==='✓'?'Submit guess':'Delete letter')}else keys.set(k,b);b.onclick=()=>{active()[0]?.focus({preventScroll:true});input(k)};wrap.append(b)}keyboard.append(wrap)}
 function mode(value){body.classList.toggle('improved',value==='improved');modes.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===value)));cells.forEach((c,i)=>{c.readOnly=improved();c.setAttribute('aria-label','Guess '+(1+Math.floor(i/5))+', letter '+(i%5+1))});refresh()}
 modes.forEach(b=>b.onclick=()=>{if(!busy){mode(b.dataset.mode);try{localStorage.setItem('joeldle-mode',b.dataset.mode)}catch{}}});
 let initial='improved';try{if(localStorage.getItem('joeldle-mode')==='legacy')initial='legacy'}catch{}mode(initial);
 function score(word,answer){const result=Array(5).fill('absent'),stock={};for(let i=0;i<5;i++){if(word[i]===answer[i])result[i]='correct';else stock[answer[i]]=(stock[answer[i]]||0)+1}for(let i=0;i<5;i++)if(result[i]==='absent'&&stock[word[i]]){stock[word[i]]--;result[i]='present'}return result}
 async function input(k){const row=active();if(!improved()||busy||!row.length)return;const empty=row.find(c=>!c.value);row.forEach(c=>c.classList.remove('invalidWord'));
 if(k==='⌫'){const c=row.filter(c=>c.value).pop();if(c)c.value='';return}
 if(k!=='✓'){if(empty)empty.value=k;return}
 if(empty){message.textContent='Enter five letters.';return}
 if(!correctWord){message.textContent='Word unavailable. Reload to try again.';return}
 busy=true;const word=row.map(c=>c.value).join('').toLowerCase();try{const response=await fetch('https://words.dev-apis.com/validate-word',{method:'POST',body:JSON.stringify({word})});if(!response.ok)throw Error();if(!(await response.json()).validWord){message.textContent='Word not recognised.';return}
 message.textContent='';score(word,correctWord).forEach((state,i)=>{if(state!=='absent')row[i].classList.add(state)});
 if(word===correctWord){endGame();victory()}else if(guessNumber===6){endGame();defeat()}else{guessNumber++;nextLine()}refresh()
 }catch{message.textContent='Couldn’t check that word. Try again.'}finally{busy=false}}
 document.addEventListener('keydown',e=>{if(!improved()||e.metaKey||e.ctrlKey||e.altKey||e.isComposing)return;if(e.target.closest('button,a')&&e.key==='Enter')return;let k=e.key==='Enter'?'✓':e.key==='Backspace'?'⌫':/^[a-z]$/i.test(e.key)?e.key.toUpperCase():null;if(k){e.preventDefault();e.stopImmediatePropagation();input(k)}},true);
 prizes.addEventListener('click',()=>{if(improved())correctWord=undefined},true);
 prizes.addEventListener('click',()=>{cells.forEach(c=>delete c.dataset.state);refresh()});
})();