import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {createPreviewRoute} from './preview-api.mjs';
const secret='nes025-ci-fabricated-key-at-least-32-bytes';
const now=1791500000;
const enc=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(sub='memberA') {
 const h=enc({alg:'HS256',typ:'JWT'});
 const p=enc({sub,iss:'neo-pass',aud:'neo-energy',token_use:'energy-customer',iat:now-30,exp:now+900});
 return h+'.'+p+'.'+createHmac('sha256',secret).update(h+'.'+p).digest('base64url');
}
const route=createPreviewRoute({secret,issuer:'neo-pass',audience:'neo-energy',clock:()=>now,
 grants:async ({subject,tenantId,siteId})=>subject==='memberA'&&tenantId==='tenantA'&&siteId==='siteA',
 readingSummary:async ({tenantId,siteId})=>({import_kwh:'4',export_kwh:'1'})});
test('GET returns synthetic read-only data for authorized site',async()=>{
 const r=await route({method:'GET',authorization:'Bearer '+token(),tenantId:'tenantA',siteId:'siteA'});
 assert.equal(r.status,200);assert.equal(r.body.kind,'SYNTHETIC_PREVIEW');
 assert.equal(r.body.payment_due,false);assert.equal(r.headers['Cache-Control'],'no-store');
});
test('missing token returns 401',async()=>{
 assert.equal((await route({method:'GET',tenantId:'tenantA',siteId:'siteA'})).status,401);
});
test('cross tenant returns 403',async()=>{
 assert.equal((await route({method:'GET',authorization:'Bearer '+token(),tenantId:'tenantB',siteId:'siteA'})).status,403);
});
test('untrusted/altered token returns 403',async()=>{
 assert.equal((await route({method:'GET',authorization:'Bearer '+token()+'x',tenantId:'tenantA',siteId:'siteA'})).status,403);
});
test('write method denied without executing backend',async()=>{
 assert.equal((await route({method:'POST',authorization:'Bearer '+token(),tenantId:'tenantA',siteId:'siteA'})).status,405);
});
