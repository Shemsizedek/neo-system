(()=>{'use strict';
  const $=id=>document.getElementById(id);
  const button=$('refresh'),gate=$('gateTitle'),detail=$('gateDetail'),checked=$('checkedAt'),next=$('nextGate');
  const names={canonical:'Canonical',mirror:'Mirror',counterparty:'Counterparty',tokenscan:'TokenScan'};
  const descriptions={
    matches_approved:'HTTP 200 · reviewed JSON matches',
    differs_from_approved:'JSON differs from approved source',
    points_to_canonical:'Asset description points to Crown URL',
    different_description:'Asset description differs from Crown URL',
    unavailable:'Endpoint unavailable or returned non-200',
    invalid:'Response missing or invalid for this asset'
  };
  const stages={
    canonical_blocked:['Canonical metadata is not ready','TokenScan cannot reliably populate the enhanced profile until the exact on-chain URL returns approved JSON without redirects.'],
    mirror_not_verified:['Metadata sources disagree','The Render source and canonical URL have not both been verified as identical; pause publication and inspect source records.'],
    counterparty_pointer_not_verified:['Counterparty pointer needs review','The current Bitcoin/Counterparty asset description is not independently confirmed to match the canonical Crown URL. Do not modify it automatically.'],
    tokenscan_pointer_not_verified:['TokenScan asset pointer needs review','TokenScan basic asset API is unavailable or its current description does not match the canonical URL. It does not prove enhanced information ingestion.'],
    canonical_ready_explorer_enrichment_unverified:['Canonical hosting checks passed','The metadata URL and the two basic asset pointers match. TokenScan enhanced-information display still needs independent verification.']
  };
  function showSource(id,value){
    const el=$(id+'State');if(!el)return;
    const state=value?.state||'unavailable';
    const good=state==='matches_approved'||state==='points_to_canonical';
    el.className='state '+(good?'good':state==='unavailable'?'':'bad');
    const http=Number.isInteger(value?.http_status)?' · HTTP '+value.http_status:'';
    el.textContent=(descriptions[state]||'Unverified source response')+http;
  }
  async function check(){
    button.disabled=true;gate.textContent='Checking canonical metadata…';detail.textContent='Waiting for the public metadata host, Render mirror, Counterparty Core and TokenScan basic asset API.';
    const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),20000);
    try{
      const response=await fetch('/api/crown/metadata-readiness?asset=NOMNI',{method:'GET',credentials:'omit',cache:'no-store',headers:{accept:'application/json'},signal:abort.signal});
      if(response.status!==200)throw Error('Service returned HTTP '+response.status);
      const result=await response.json();
      if(result?.schema!=='neo.crown.metadata-readiness.v1'||result.asset!=='NOMNI'||result.read_only!==true||result.safe_to_issue!==false||result.explorer_additional_information_verified!==false)throw Error('Incomplete or unsafe diagnostic response');
      for(const key of Object.keys(names))showSource(key,result[key]);
      const [title,description]=stages[result.status]||['Metadata status unresolved','The host did not provide a recognized readiness result. No publication is approved.'];
      gate.textContent=title;
      detail.textContent=description;
      checked.textContent=Number.isFinite(Date.parse(result.checked_at))?new Date(result.checked_at).toLocaleString()+' (results cached up to 90 seconds)':'Not verified';
      next.textContent=typeof result.next_gate==='string'?result.next_gate:'Verify the exact canonical metadata URL before issuer-side activity.';
    }catch{
      gate.textContent='Unable to verify metadata right now';
      detail.textContent='The diagnostic service is unavailable or not responding. This is not evidence of TokenScan ingestion or issuer authorization.';
      checked.textContent='Unavailable';
      next.textContent='Check the existing Crown runtime health, approved NEO metadata mirror and canonical domain mapping; do not reissue the token.';
      for(const id of Object.keys(names)){$(id+'State').textContent='Not verified in this check';$(id+'State').className='state';}
    }finally{clearTimeout(timer);button.disabled=false;}
  }
  button.addEventListener('click',check);
  check();
})();
