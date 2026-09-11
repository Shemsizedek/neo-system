const money=new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:8});
async function load(){
  const api=document.querySelector('#apiStatus'),db=document.querySelector('#dbStatus'),value=document.querySelector('#nomniValue'),source=document.querySelector('#nomniSource');
  try{const status=await fetch('/api/v1/community/status').then(r=>r.json());api.textContent='● CES API online';db.textContent=status.database==='connected'?'● Database connected':'○ Database unavailable';db.className=status.database==='connected'?'ok':'warn'}catch{api.textContent='○ CES API unavailable';db.textContent='○ Database unavailable'}
  try{const quote=await fetch('/api/v1/nomni/valuation').then(r=>r.json());if(quote.available){value.textContent=`∞1 = ${money.format(quote.nomniUsd)}`;source.textContent=`${quote.source} · ${new Date(quote.observedAt).toLocaleString()}`}else{value.textContent='Market price unavailable';source.textContent=quote.reason}}catch{value.textContent='Market price unavailable';source.textContent='Live valuation sources could not be reached.'}
}
document.querySelector('#refresh').addEventListener('click',load);load();
