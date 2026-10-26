import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectNeoCanonicalActivation} from './preflight.mjs';
import {APPROVED_NEO_METADATA} from './worker.mjs';

function mock({canonical=200,body=JSON.stringify(APPROVED_NEO_METADATA),redirect=false,head=200}={}){
 const calls=[];
 const fetchImpl=async (url,options)=>{
  calls.push({url,method:options.method,redirect:options.redirect});
  const isCanonical=url.endsWith('/assets/NOMNI/tokenscan.json');
  const headers={'content-type':'application/json'};
  if(isCanonical&&redirect)headers.location='https://other.test/';
  return new Response(options.method==='HEAD'?null:isCanonical?body:'Not found',{
    status:isCanonical?(options.method==='HEAD'?head:canonical):404,
    headers:isCanonical?headers:{'content-type':'text/plain'}
  });
 };
 return {fetchImpl,calls};
}
test('returns blocked when canonical hostname returns 404 without claiming issuer authentication is healthy',async()=>{
 const x=mock({canonical:404,head:404});
 const r=await inspectNeoCanonicalActivation({fetchImpl:x.fetchImpl});
 assert.equal(r.canonical.status,'BLOCKED');
 assert.equal(r.canonical.get_http_status,404);
 assert.equal(r.safe_to_activate_auto_issuance,false);
 assert.equal(r.authentication_operationally_verified,false);
 assert.equal(r.mutations_performed,false);
 assert.ok(x.calls.every(c=>c.redirect==='manual'&&c.method!=='POST'));
});
test('exact matching direct JSON and HEAD pass but cannot imply authenticated issuer or TokenScan enrichment',async()=>{
 const r=await inspectNeoCanonicalActivation({fetchImpl:mock().fetchImpl});
 assert.equal(r.canonical.status,'MATCHES_APPROVED');
 assert.equal(r.canonical.exact_approved_json,true);
 assert.equal(r.canonical.redirected,false);
 assert.equal(r.authentication_operationally_verified,false);
 assert.equal(r.tokenscan_enhanced_display_verified,false);
 assert.equal(r.safe_to_activate_auto_issuance,false);
 assert.equal(r.other_routes.length,3);
 assert.equal(r.other_routes[1].expected_behavior_verified,false);
});
test('HTTP redirects, different JSON bodies, wrong MIME and HEAD mismatch never count as ready',async()=>{
 for(const args of [{redirect:true},{body:'{"asset":"NOMNI"}'},{head:404}]){
  const r=await inspectNeoCanonicalActivation({fetchImpl:mock(args).fetchImpl});
  assert.equal(r.canonical.status,'BLOCKED');
  assert.equal(r.safe_to_activate_auto_issuance,false);
 }
});
test('invalid timeout fails before network call',async()=>{
 await assert.rejects(inspectNeoCanonicalActivation({timeoutMs:0}),/invalid_probe_timeout/);
});
