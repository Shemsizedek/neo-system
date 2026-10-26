import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {handleNeoCanonicalRequest,CANONICAL_NEO_METADATA_ROUTE,APPROVED_NEO_METADATA} from './worker.mjs';
import {validateLegacyEnhancedJSON,crownIssuanceDescription} from '../../server/crown-metadata/issuance-autopublish.mjs';

const canonical='https://crown.holytemples.org/assets/NOMNI/tokenscan.json';
const fixture=new URL('../../apps/neoscan/web/cardmaster/assets/NOMNI/tokenscan.json',import.meta.url);
const approved=JSON.parse(await readFile(fixture,'utf8'));
const never=()=>{throw Error('unexpected_fetch');};

test('exact NEO canonical JSON matches approved static metadata and returns direct HTTP 200',async()=>{
 const r=await handleNeoCanonicalRequest(new Request(canonical),{passthrough:never});
 assert.equal(r.status,200);
 assert.equal(r.headers.get('location'),null);
 assert.match(r.headers.get('content-type'),/application\/json/);
 const raw=await r.text();
 assert.equal(Number(r.headers.get('content-length')),new TextEncoder().encode(raw).length);
 const data=JSON.parse(raw);
 assert.deepEqual(data,approved);
 assert.deepEqual(data,APPROVED_NEO_METADATA);
 assert.deepEqual(validateLegacyEnhancedJSON(data),data);
 assert.equal(crownIssuanceDescription('NOMNI'),canonical);
});
test('read-only HEAD and blocked write methods',async()=>{
 const h=await handleNeoCanonicalRequest(new Request(canonical,{method:'HEAD'}),{passthrough:never});
 assert.equal(h.status,200);
 assert.equal(await h.text(),'');
 for(const method of ['POST','PUT','PATCH','DELETE']){
   const r=await handleNeoCanonicalRequest(new Request(canonical,{method}),{passthrough:never});
   assert.equal(r.status,405);
   assert.equal(r.headers.get('allow'),'GET, HEAD');
 }
});
test('query parameter injection fails closed',async()=>{
 for(const suffix of ['?asset=NEO','?issuer=unknown','?price=500','?format=svg','?asset=NOMNI&asset=NEO']){
   const r=await handleNeoCanonicalRequest(new Request(canonical+suffix),{passthrough:never});
   assert.equal(r.status,400);
   assert.equal((await r.json()).error,'canonical_metadata_requires_exact_url');
 }
});
test('all non-metadata paths and noncanonical hostnames pass through unchanged',async()=>{
 for(const url of [
   'https://crown.holytemples.org/',
   'https://crown.holytemples.org/auth/verify',
   'https://crown.holytemples.org/api/agents/enroll',
   'https://crown.holytemples.org/.well-known/jwks.json',
   'https://crown.holytemples.org/assets/NEOBOND/tokenscan.json',
   'https://crown.holytemples.org/assets/NOMNI/showcase.json',
   'https://holytemples.org/assets/NOMNI/tokenscan.json'
 ]){
   const original=new Request(url);
   let called=0;
   const r=await handleNeoCanonicalRequest(original,{passthrough:req=>{
     called++;assert.equal(req,original);return new Response('unchanged',{status:207});
   }});
   assert.equal(r.status,207);
   assert.equal(called,1);
 }
});
test('binding is an exact Crown metadata route, never the entire host',()=>{
 assert.equal(CANONICAL_NEO_METADATA_ROUTE.hostname,'crown.holytemples.org');
 assert.equal(CANONICAL_NEO_METADATA_ROUTE.path,'/assets/NOMNI/tokenscan.json');
 assert.notEqual(CANONICAL_NEO_METADATA_ROUTE.route_pattern,'crown.holytemples.org/*');
});
