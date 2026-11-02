'use strict';
const sections=new Set(['overview','accounts','exchange','markets','activity','integrations']);
const titles={overview:'Overview',accounts:'Accounts',exchange:'Exchange',markets:'Markets',activity:'Activity',integrations:'Integrations'};
const byId=id=>document.getElementById(id);
const buttons=()=>[...document.querySelectorAll('[data-section]')];
const cards=()=>[...document.querySelectorAll('[data-open]')];
function showSection(section,{setHash=true}={}){
  const id=sections.has(section)?section:'overview';
  for(const view of document.querySelectorAll('[data-view]')){
    const active=view.dataset.view===id;
    view.classList.toggle('active',active);
    view.hidden=!active;
  }
  for(const nav of buttons()){
    const active=nav.dataset.section===id;
    nav.classList.toggle('active',active);
    if(active)nav.setAttribute('aria-current','page');
    else nav.removeAttribute('aria-current');
  }
  byId('breadcrumb').textContent=titles[id];
  byId('page-heading').textContent={
    overview:'Good things are taking shape.',accounts:'Accounts, with confidence.',
    exchange:'Community exchange.',markets:'A marketplace for everyone.',
    activity:'Every movement, accounted for.',integrations:'Connected, carefully.'
  }[id];
  if(setHash && window.location.hash!=='#'+id)history.replaceState(null,'','#'+id);
}
async function fetchStatus(path){
  try{
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),6000);
    try {
      const response=await fetch(path,{method:'GET',headers:{accept:'application/json'},credentials:'omit',cache:'no-store',signal:controller.signal,redirect:'error'});
      const data=await response.json().catch(()=>null);
      return {status:response.status,ok:response.ok,data};
    }finally{clearTimeout(timeout)}
  }catch{return {status:0,ok:false,data:null}}
}
function statusText(id,text,warning){
  const node=byId(id);
  if(!node)return;
  node.textContent=text;
  node.classList.toggle('warn',warning);
}
let refreshInProgress=false;
async function refreshStatus(){
  if(refreshInProgress)return;
  refreshInProgress=true;
  const triggers=[byId('refreshStatus'),byId('refreshDetail')].filter(Boolean);
  triggers.forEach(x=>{x.disabled=true;x.setAttribute('aria-busy','true')});
  statusText('runtimeStatus','Checking…',false);
  statusText('bankStatus','Checking…',false);
  try{
    const [preview,bank]=await Promise.all([fetchStatus('/healthz'),fetchStatus('/api/v1/community/status')]);
    const runtimeHealthy=preview.ok && preview.data?.ok===true && preview.data?.mode==='read-only-preview';
    // A 503 is the expected safe response while the bank has no connected account backend.
    const bankReady=bank.ok && bank.data?.database==='connected' && bank.data?.accountServices===true;
    const runtimeLabel=runtimeHealthy?'Preview online':'Unavailable';
    const bankLabel=bankReady?'Connected':'Not connected';
    statusText('runtimeStatus',runtimeLabel,!runtimeHealthy);
    statusText('runtimeStatusDetail',runtimeLabel,!runtimeHealthy);
    statusText('bankStatus',bankLabel,!bankReady);
    statusText('bankStatusDetail',bankLabel,!bankReady);
    byId('checkedAt').textContent='Last checked '+new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
  }finally{
    refreshInProgress=false;
    triggers.forEach(x=>{x.disabled=false;x.removeAttribute('aria-busy')});
  }
}
buttons().forEach(node=>node.addEventListener('click',()=>showSection(node.dataset.section)));
cards().forEach(node=>node.addEventListener('click',()=>{
  showSection(node.dataset.open);
  byId('main').focus({preventScroll:true});
  window.scrollTo({top:0,behavior:'smooth'});
}));
window.addEventListener('hashchange',()=>showSection(location.hash.slice(1),{setHash:false}));
for(const id of ['refreshStatus','refreshDetail'])byId(id)?.addEventListener('click',refreshStatus);
showSection(location.hash.slice(1),{setHash:!location.hash});
refreshStatus();