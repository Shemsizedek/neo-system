import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createLocalServer} from '../NES-027/server.mjs';
const key='synthetic-ci-key-for-nes028-validation-only';
const epoch=1791500000;
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function credential(subject){
 const h=encode({alg:'HS256',typ:'JWT'});
 const p=encode({sub:subject,iss:'neo-pass',aud:'neo-energy',
  token_use:'energy-customer',iat:epoch-30,exp:epoch+120});
 return [h,p,createHmac('sha256',key).update(h+'.'+p).digest('base64url')].join('.');
}
test('GET enforces signed principal and synthetic site isolation',async()=>{
 const calls=[];
 const pool={query:async(sql,params)=>{
  calls.push(params);
  const [subject,tenant,site]=params;
  if(subject==='memberA'&&tenant==='tenantA'&&site==='siteA')
   return {rows:[{import_kwh:'12',export_kwh:'3'}]};
  return {rows:[]};
 }};
 const server=createLocalServer({pool,secret:key,clock:()=>epoch});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const path='/v1/energy/tenants/';
 const get=(tenant,site,authorization)=>fetch(base+path+tenant+'/sites/'+site+'/overview',
    {headers:authorization?{Authorization:authorization}:{}});
 try{
  const ok=await get('tenantA','siteA','Bearer '+credential('memberA'));
  assert.equal(ok.status,200);
  const payload=await ok.json();
  assert.equal(payload.import_kwh,'12');
  assert.equal(payload.payment_due,false);
  assert.equal(payload.field_control_authorized,false);
  assert.equal((await get('tenantB','siteB','Bearer '+credential('memberA'))).status,403);
  assert.equal((await get('tenantA','siteA')).status,401);
  assert.equal((await get('tenantA','siteA','Bearer invalid')).status,401);
  assert.equal((await fetch(base+path+'tenantA/sites/siteA/overview',{method:'POST'})).status,405);
  assert.deepEqual(calls[0],['memberA','tenantA','siteA']);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
