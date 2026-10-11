import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import pg from 'pg';
import { createLocalServer } from '../NES-027/server.mjs';

const now=1791500000;
const secret='nes029-test-only-secret-longer-than-32-bytes';
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function token(sub,patch={}) {
 const a=encode({alg:'HS256',typ:'JWT'});
 const b=encode({sub,iss:'neo-pass',aud:'neo-energy',
  token_use:'energy-customer',iat:now-30,exp:now+300,...patch});
 const c=createHmac('sha256',secret).update(a+'.'+b).digest('base64url');
 return a+'.'+b+'.'+c;
}
test('HTTP signed identity resolves PostgreSQL grant and revocation',async()=>{
 const pool=new pg.Pool({host:'127.0.0.1',port:5432,user:'nes027_api',
  password:'ci-only-api-password',database:'neo_energy_ci',max:2});
 const admin=new pg.Client({host:'127.0.0.1',port:5432,user:'postgres',
  password:'disposable-ci-password',database:'neo_energy_ci'});
 await admin.connect();
 const server=createLocalServer({pool,secret,issuer:'neo-pass',audience:'neo-energy',
  clock:()=>now});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/v1/energy/tenants/';
 const request=(sub,tenant,site,credential)=>
  fetch(base+tenant+'/sites/'+site+'/overview',
   {headers:credential===null?{}:{Authorization:'Bearer '+(credential||token(sub))}});
 try {
  const a=await request('customer-a','tenantA','siteA');
  assert.equal(a.status,200);
  assert.equal((await a.json()).import_kwh,'10');
  assert.equal((await request('customer-a','tenantB','siteB')).status,403);
  assert.equal((await request('customer-b','tenantA','siteA')).status,403);
  assert.equal((await request('customer-b','tenantB','siteB')).status,200);
  assert.equal((await request('customer-a','tenantA','siteA',null)).status,401);
  assert.equal((await request('customer-a','tenantA','siteA',token('customer-a',{exp:now-1}))).status,401);
  await admin.query('UPDATE nes027.site_grants SET revoked=true WHERE subject=$1',['customer-a']);
  assert.equal((await request('customer-a','tenantA','siteA')).status,403);
 }finally{
  await new Promise(resolve=>server.close(resolve));
  await pool.end();
  await admin.end();
 }
});
