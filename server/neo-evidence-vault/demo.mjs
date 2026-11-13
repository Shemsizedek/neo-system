// Synthetic, ephemeral, loopback-only demonstration. No external services.
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {createEvidenceVault} from './store.mjs';
import {createHandler} from './server.mjs';
const token=randomUUID();
const vault=createEvidenceVault(':memory:');
const server=http.createServer(createHandler(vault,{credentials:[{token,actor:'synthetic-demo-operator',roles:['read','ingest','review']}]}));
try{
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 async function call(path,method='GET',body){
  const res=await fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
  if(!res.ok)throw new Error(`demo_http_${res.status}`);
  return res.json();
 }
 const entry=await call('/assets/SYNTHETIC-BPP/evidence','POST',{title:'Synthetic policy research fixture — not a real reserve asset',sourceType:'SYNTHETIC',sourceUrl:'https://example.invalid/fixture',note:'No monetary value; no verified factual claim.'});
 await call(`/evidence/${entry.id}/review`,'PATCH',{status:'ACCEPTED',note:'Accepted solely as demonstration input.'});
 const evidence=await call('/assets/SYNTHETIC-BPP/evidence');
 const audit=await call('/assets/SYNTHETIC-BPP/audit');
 console.log(JSON.stringify({synthetic:true,persistent:false,evidence:evidence.evidence,events:audit.events},null,2));
}finally{
 await new Promise(resolve=>server.close(resolve));vault.close();
}
