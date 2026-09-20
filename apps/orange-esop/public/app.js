const role='AUDITOR';
async function load(){
  const r=await fetch('/api/esop/dashboard',{headers:{'x-neo-role':role}});
  if(!r.ok){document.querySelector('#status').textContent='API UNAVAILABLE';return;}
  const d=await r.json();
  document.querySelector('#participants').textContent=d.participants.length;
  document.querySelector('#stewardship').textContent=d.stewardshipEntries;
  document.querySelector('#reconcile').textContent=d.reconciliation?.status||'PENDING';
  document.querySelector('#audit').textContent=d.auditCount;
  document.querySelector('#status').textContent=d.reconciliation?.status==='RECONCILIATION_HOLD'?'HOLD':'CONTROLLED';
  document.querySelector('#people').innerHTML=d.participants.length?d.participants.map(p=>`<div class="person"><b>${p.templeName||p.legalName||p.participantId}</b><span>${p.chaplaincyOffice||p.employeeClass||'Employee'}</span></div>`).join(''):'No participant data loaded.';
}
document.querySelector('#refresh').addEventListener('click',load); load();