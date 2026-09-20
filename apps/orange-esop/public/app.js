async function load(){
  const r=await fetch('/api/esop/public-summary');
  if(!r.ok){document.querySelector('#status').textContent='API UNAVAILABLE';return;}
  const d=await r.json();
  document.querySelector('#participants').textContent=d.participantCount;
  document.querySelector('#stewardship').textContent=d.stewardshipEntries;
  document.querySelector('#reconcile').textContent=d.reconciliationStatus;
  document.querySelector('#audit').textContent=d.auditCount;
  document.querySelector('#status').textContent=d.reconciliationStatus==='RECONCILIATION_HOLD'?'HOLD':d.reconciliationStatus==='PASS'?'CONTROLLED':'PENDING';
}
document.querySelector('#refresh').addEventListener('click',load);
load();
