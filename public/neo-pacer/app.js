const RAW='https://raw.githubusercontent.com/Shemsizedek/neo-system/main/data/neo-pacer';
const state={cases:[],evidence:[],title:[],view:'cases',q:''};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function load(){
  const [cases,evidence,title]=await Promise.all([
    fetch(`${RAW}/cases.json`).then(r=>r.json()),
    fetch(`${RAW}/evidence.json`).then(r=>r.json()),
    fetch(`${RAW}/title-chain.json`).then(r=>r.json())
  ]);
  Object.assign(state,{cases,evidence,title}); render();
}
function caseCards(){const q=state.q.toLowerCase();return state.cases.filter(x=>JSON.stringify(x).toLowerCase().includes(q)).map(c=>`<article class="card"><div class="mono">${esc(c.case_no)}</div><h2>${esc(c.caption)}</h2><span class="pill">${esc(c.status)}</span><p>${esc(c.summary)}</p><div class="meta">${esc(c.case_class)} · ${esc(c.jurisdiction_class)}</div></article>`).join('')||'<p>No matching cases.</p>'}
function evidenceTable(){const q=state.q.toLowerCase();const rows=state.evidence.filter(x=>JSON.stringify(x).toLowerCase().includes(q)).map(e=>`<tr><td class="mono">${esc(e.evidence_id)}</td><td>${esc(e.title)}</td><td>${esc(e.evidence_class)}</td><td>${esc(e.authentication_status)}</td><td>${esc(e.score)}</td></tr>`).join('');return `<table><thead><tr><th>ID</th><th>Evidence</th><th>Class</th><th>Status</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>`}
function titleChain(){return `<div class="timeline">${state.title.map(n=>`<article class="node"><div class="seq">${n.seq}</div><div><span class="pill">${esc(n.node_type)}</span><h3>${esc(n.instrument_name)}</h3><p>${esc(n.property_description)}</p><div class="meta">${esc(n.authentication_status)} — ${esc(n.notes)}</div></div></article>`).join('')}</div>`}
function render(){const c=$('#content');if(state.view==='cases')c.innerHTML=`<div class="stats"><div><b>${state.cases.length}</b><span>Cases</span></div><div><b>${state.evidence.length}</b><span>Evidence Items</span></div><div><b>${state.title.length}</b><span>Title Nodes</span></div></div><div class="grid">${caseCards()}</div>`;if(state.view==='evidence')c.innerHTML=evidenceTable();if(state.view==='title')c.innerHTML=titleChain();}
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{state.view=b.dataset.view;render()});
$('#search').addEventListener('input',e=>{state.q=e.target.value;render()});
load().catch(err=>{$('#content').innerHTML=`<div class="error">Registry load failed: ${esc(err.message)}</div>`});
