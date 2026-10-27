import { fetchDownloadStats } from './download-stats.js';
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
