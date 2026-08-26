const CLAIM_ENDPOINT='../api/noogle/claim-graph.json';
let claimCache=null;

async function loadClaims(){
  if(claimCache) return claimCache;
  const r=await fetch(CLAIM_ENDPOINT,{headers:{accept:'application/json'},cache:'no-store'});
  if(!r.ok) throw new Error(`Claim graph unavailable: ${r.status}`);
  claimCache=await r.json(); return claimCache;
}

function claimScore(claim,terms){
  const text=String(claim.text||'').toLowerCase();
  return terms.reduce((s,t)=>s+(text.includes(t)?1:0),0)+(claim.confidence||0);
}

function renderClaims(payload,query){
  const panel=document.getElementById('claimPanel');
  const badge=document.getElementById('claimBadge');
  if(!panel||!badge) return;
  const terms=String(query).toLowerCase().split(/\s+/).filter(t=>t.length>2);
  const matches=(payload.claims||[]).map(c=>({c,score:claimScore(c,terms)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,4);
  badge.textContent=matches.length?`${matches.length} CLAIMS`:'NO MATCH';
  if(!matches.length){panel.innerHTML='<p class="muted">No indexed claim matched this search yet.</p>';return;}
  const evidence=payload.evidence||[];
  panel.innerHTML=matches.map(({c})=>{
    const rows=evidence.filter(e=>e.claimId===c.id).slice(0,5);
    const pct=Math.round((c.confidence||0)*100);
    return `<article class="claim-card"><div class="claim-head"><strong>${escapeHtml(c.text)}</strong><span class="badge ${c.status==='disputed'?'warning':'safe'}">${escapeHtml(c.status||'indexed')}</span></div><div class="claim-meter"><span style="width:${pct}%"></span></div><p class="muted">Evidence weight ${pct}% · ${c.supportCount||0} supporting · ${c.contradictCount||0} contradicting · ${c.sourceDiversity||0} source groups</p>${rows.map(e=>`<div class="evidence-row"><span class="badge">${escapeHtml(e.stance)}</span><a href="${escapeHtml(e.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(e.publisher||e.sourceClass||'Source')}</a><small>${escapeHtml(e.evidenceState||'unverified')}</small></div>`).join('')}</article>`;
  }).join('');
}

async function runClaimSearch(query){
  try{const data=await loadClaims();renderClaims(data,query);}catch(error){const panel=document.getElementById('claimPanel');const badge=document.getElementById('claimBadge');if(badge)badge.textContent='DEGRADED';if(panel)panel.innerHTML=`<p class="muted">${escapeHtml(error.message)}</p>`;}
}
window.noogleClaimSearch=runClaimSearch;
document.addEventListener('submit',event=>{const input=event.target?.querySelector?.('input');if(input?.value)runClaimSearch(input.value);},true);
