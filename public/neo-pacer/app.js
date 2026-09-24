const RAW='https://raw.githubusercontent.com/Shemsizedek/neo-system/main/data/neo-pacer';
const state={records:[],legacyCases:[],view:'records',q:''};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=d=>{try{return new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(new Date(d))}catch{return d||''}};
async function json(url){const r=await fetch(url,{headers:{accept:'application/json'}});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.json()}
async function load(){
  const [published,legacy]=await Promise.all([
    json('/v1/public/records?limit=200'),
    json(`${RAW}/cases.json`).catch(()=>[])
  ]);
  state.records=published.items||[];
  state.legacyCases=Array.isArray(legacy)?legacy:[];
  render();
}
function recordCards(){
  const q=state.q.toLowerCase();
  const items=state.records.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
  if(!items.length)return '<div class="empty">No matching public records are currently published.</div>';
  return `<div class="grid">${items.map(r=>`<article class="card">
    <div class="row"><span class="mono">${esc(r.claimNo)}</span><span class="pill">${esc(r.recordType)}</span></div>
    <h2>${esc(r.title)}</h2>
    <p>${esc(r.summary)}</p>
    <div class="meta">Published ${esc(fmt(r.publishedAt))}</div>
    <details><summary>Record details</summary><pre>${esc(JSON.stringify(r.publicPayload||{},null,2))}</pre></details>
    <div class="hash"><strong>Publication SHA-256</strong><code>${esc(r.publicationHash)}</code></div>
  </article>`).join('')}</div>`;
}
function legacyCards(){
  const q=state.q.toLowerCase();
  const items=state.legacyCases.filter(x=>JSON.stringify(x).toLowerCase().includes(q));
  if(!items.length)return '<div class="empty">No matching legacy registry entries.</div>';
  return `<div class="legacy-note">Legacy research entries are preserved separately from the production public-record publication ledger.</div><div class="grid">${items.map(c=>`<article class="card"><div class="mono">${esc(c.case_no)}</div><h2>${esc(c.caption)}</h2><span class="pill">${esc(c.status)}</span><p>${esc(c.summary)}</p><div class="meta">${esc(c.case_class)} · ${esc(c.jurisdiction_class)}</div></article>`).join('')}</div>`;
}
function render(){
  const c=$('#content');
  if(state.view==='records')c.innerHTML=`<div class="stats"><div><b>${state.records.length}</b><span>Published Records</span></div><div><b>${new Set(state.records.map(r=>r.claimNo)).size}</b><span>Public Matters</span></div><div><b>SHA-256</b><span>Publication Fingerprints</span></div></div>${recordCards()}`;
  else c.innerHTML=legacyCards();
}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;$('#search').placeholder=state.view==='records'?'Search public records':'Search legacy registry';render()});
$('#search').addEventListener('input',e=>{state.q=e.target.value;render()});
load().catch(err=>{$('#content').innerHTML=`<div class="error">Public records load failed: ${esc(err.message)}</div>`});
