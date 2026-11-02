import {layout,pack} from './layout.mjs';
const $=id=>document.getElementById(id);let items=[],generation=0;
const valid=s=>{try{const u=new URL(s);return u.protocol==='https:'&&u.hostname==='s3.amazonaws.com'&&u.pathname.startsWith('/asset.easil.com/')&&/\.(jpg|jpeg|png|webp|gif)$/i.test(u.pathname)?u.href:null;}catch{return null;}};
function extract(text){const urls=new Set();for(const m of text.replaceAll('\\/','/').matchAll(/https:\/\/s3\.amazonaws\.com\/asset\.easil\.com\/[^\s"'<>]+/g)){const u=valid(m[0].replaceAll('&amp;','&'));if(u)urls.add(u);}return [...urls];}
function collect(){const urls=[...new Set([...document.images].map(i=>i.currentSrc||i.src).filter(s=>{try{const u=new URL(s);return u.protocol==='https:'&&u.hostname==='s3.amazonaws.com'&&u.pathname.startsWith('/asset.easil.com/')&&/\.(jpg|jpeg|png|webp|gif)$/i.test(u.pathname);}catch{return false;}}))];if(!urls.length){alert('No Easil images found. Open the image list and wait for the images to load.');return;}const text=urls.join('\n');const fallback=()=>prompt('Copy these image links, then paste them into Image Reference Grid:',text);if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>alert(urls.length+' image links copied. Paste them into Image Reference Grid.'),fallback);else fallback();}
$('bookmark').href='javascript:('+collect.toString()+')()';$('bookmark').onclick=e=>{e.preventDefault();$('status').textContent='Drag this link onto your bookmarks bar, then click the saved bookmark while viewing your images in Easil.';};
function arrange(){
  const visible=items.filter(i=>!i.removed),grid=$('grid'),masonry=$('masonry');
  $('clean').disabled=!visible.length;
  if(!visible.length){masonry.replaceChildren();return;}
  const style=getComputedStyle(grid);
  const width=Math.max(1,grid.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight));
  const height=Math.max(1,grid.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom));
  const ratios=visible.map(i=>i.img.naturalWidth/i.img.naturalHeight||1);
  const choice=layout(visible.length,width,height,ratios,12,$('columns').value);
  const columns=Array.from({length:choice.columns},()=>{
    const column=document.createElement('div');
    column.className='masonry-column';
    column.style.width=choice.columnWidth+'px';
    return column;
  });
  const {assignments}=pack(ratios,choice.columns,choice.columnWidth);
  visible.forEach((item,i)=>columns[assignments[i]].append(item.cell));
  masonry.replaceChildren(...columns);
}
let arrangePending=false;
function scheduleArrange(){
  if(arrangePending)return;
  arrangePending=true;
  requestAnimationFrame(()=>{arrangePending=false;arrange();});
}
function status(){const ready=items.filter(i=>i.state==='ready').length,failed=items.filter(i=>i.state==='failed').length; $('progress').textContent=`${ready}/${items.length} loaded${failed?` · ${failed} unavailable`:''}`;scheduleArrange();}
function load(){const urls=extract($('paste').value);if(!urls.length){$('status').textContent='No image links found. Use the Copy image links bookmark on the Easil image list; View Source and saved pages may not contain the images.';return;}const gen=++generation;items=[];$('masonry').replaceChildren();$('modal').classList.remove('clean');$('modal').showModal();document.body.style.overflow='hidden';$('status').textContent='';for(const url of urls){const cell=document.createElement('div'),img=new Image(),remove=document.createElement('button'),label=document.createElement('span');cell.className='tile';remove.className='remove';remove.textContent='×';remove.setAttribute('aria-label','Remove '+new URL(url).pathname.split('/').pop());label.textContent='Loading…';img.alt='';img.referrerPolicy='no-referrer';img.hidden=true;const item={cell,img,state:'loading',removed:false};items.push(item);remove.onclick=()=>{item.removed=true;cell.hidden=true;arrange();};cell.append(img,label,remove);$('masonry').append(cell);let triedFallback=false;const finish=ok=>{if(gen!==generation)return;clearTimeout(timeout);item.state=ok?'ready':'failed';img.hidden=!ok;label.hidden=ok;label.textContent='Image unavailable';status();};const fallback=()=>{if(gen!==generation)return;if(!triedFallback&&url.includes('/thumb_')){triedFallback=true;clearTimeout(timeout);timeout=setTimeout(()=>finish(false),20000);img.src=url;}else finish(false);};let timeout=setTimeout(fallback,20000);img.onload=()=>finish(true);img.onerror=fallback;img.src=url.replace('/thumb_','/');}status();}
$('load').onclick=load;$('drop').onclick=()=>$('file').click();async function file(f){if(!f)return;try{$('paste').value=await f.text();load();}catch{$('status').textContent='Could not read this file. Try pasting the copied links.';}}$('file').onchange=e=>{file(e.target.files[0]);e.target.value='';};$('drop').ondragover=e=>e.preventDefault();$('drop').ondrop=e=>{e.preventDefault();file(e.dataTransfer.files[0]);};$('restore').onclick=()=>{items.forEach(i=>{i.removed=false;i.cell.hidden=false;});arrange();};$('columns').onchange=arrange;$('background').oninput=()=>{$('grid').style.background=$('background').value;};$('clean').onclick=()=>{$('modal').classList.add('clean');arrange();};$('grid').onclick=()=>{if($('modal').classList.contains('clean')){$('modal').classList.remove('clean');arrange();}};$('close').onclick=()=>$('modal').close();$('modal').addEventListener('cancel',e=>{if($('modal').classList.contains('clean')){e.preventDefault();$('modal').classList.remove('clean');arrange();}});$('modal').addEventListener('close',()=>{document.body.style.overflow='';$('load').focus();});new ResizeObserver(scheduleArrange).observe($('grid'));
