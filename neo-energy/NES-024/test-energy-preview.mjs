import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createEnergyPreview} from './energy-preview.mjs';
const secret='test-only-secret-not-for-deployment-123456789';
const now=1791500000;
function token(sub='a',change={}) {
 const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
 const header=enc({alg:'HS256',typ:'JWT'});
 const body=enc({sub,iss:'neo-pass',aud:'neo-energy',token_use:'energy-customer',
                 iat:now-60,exp:now+600,...change});
 return header+'.'+body+'.'+createHmac('sha256',secret).update(header+'.'+body).digest('base64url');
}
const permissions=new Set(['a:A:homeA','b:B:homeB']);
const preview=createEnergyPreview({secret,issuer:'neo-pass',audience:'neo-energy',clock:()=>now,
 grants:async ({subject,tenantId,siteId})=>permissions.has(subject+':'+tenantId+':'+siteId),
 readingSummary:async ({siteId})=>({import_kwh:siteId==='homeA'?'10':'20',export_kwh:'2'})});
test('signed customer with scoped grant gets synthetic data',async()=>{
 const x=await preview({token:token(),tenantId:'A',siteId:'homeA'});
 assert.equal(x.import_kwh,'10');assert.equal(x.payment_due,false);
});
test('tenant A denied tenant B site',async()=>{
 await assert.rejects(preview({token:token(),tenantId:'B',siteId:'homeB'}));
});
test('claims cannot forge site grant',async()=>{
 await assert.rejects(preview({token:token('a',{tenant:'B',siteId:'homeB'}),tenantId:'B',siteId:'homeB'}));
});
test('expired token denied',async()=>{
 await assert.rejects(preview({token:token('a',{exp:now-1}),tenantId:'A',siteId:'homeA'}));
});
test('revoked grant denied on next request',async()=>{
 permissions.delete('a:A:homeA');
 await assert.rejects(preview({token:token(),tenantId:'A',siteId:'homeA'}));
 permissions.add('a:A:homeA');
});
test('no grant provider fails startup',()=>assert.throws(()=>
 createEnergyPreview({secret,issuer:'neo-pass',audience:'neo-energy',readingSummary:async()=>({})})));
