import { fetchDownloadStats } from './download-stats.js';
let customCursor=document.querySelector('.star-cursor');
if(!customCursor){
 customCursor=document.createElement('div');
 customCursor.className='star-cursor';customCursor.textContent='✧';
 customCursor.setAttribute('aria-hidden','true');document.body.appendChild(customCursor);
}
const hideCustomCursor=()=>{
 document.body.classList.remove('custom-pointer-active');customCursor.style.opacity='0';
};
window.addEventListener('pointermove',event=>{
 if(event.pointerType!=='mouse'){hideCustomCursor();return;}
 customCursor.style.left=event.clientX+'px';customCursor.style.top=event.clientY+'px';
 customCursor.style.opacity='1';document.body.classList.add('custom-pointer-active');
},{passive:true});
window.addEventListener('pointerout',event=>{if(!event.relatedTarget)hideCustomCursor();});
window.addEventListener('blur',hideCustomCursor);
const downloadCount=document.querySelector('[data-download-count]');
if(downloadCount) {
 fetchDownloadStats().then(stats=>{
  downloadCount.textContent=stats.total.toLocaleString('en-US');
  downloadCount.title=`GitHub release-asset downloads across ${stats.releases} releases. Not unique players.`;
 }).catch(()=>{}); // Keep the build-time count if GitHub is unavailable or rate-limited.
}
const toggle=document.querySelector('.nav-toggle');
toggle?.addEventListener('click',()=>{
 const open=toggle.getAttribute('aria-expanded')!=='true';
 toggle.setAttribute('aria-expanded',String(open));
 document.querySelector('#main-navigation').classList.toggle('is-open',open);
});
document.addEventListener('keydown',event=>{
 if(event.key==='Escape' && toggle?.getAttribute('aria-expanded')==='true'){
  toggle.setAttribute('aria-expanded','false');document.querySelector('#main-navigation').classList.remove('is-open');toggle.focus();
 }
});
for(const input of document.querySelectorAll('[data-filter]')){
 const entries=[...document.querySelectorAll(input.dataset.filter)];
 const empty=input.parentElement.querySelector('.search-empty');
 input.addEventListener('input',()=>{
  const query=input.value.trim().toLowerCase();let found=0;
  for(const item of entries){item.hidden=!item.textContent.toLowerCase().includes(query);if(!item.hidden)found++;}
  if(empty)empty.hidden=found>0;
 });
}
if(location.hash){
 const target=document.getElementById(decodeURIComponent(location.hash.slice(1)));
 if(target?.tagName==='DETAILS')target.open=true;
}
