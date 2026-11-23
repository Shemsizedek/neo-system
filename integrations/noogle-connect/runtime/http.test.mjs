import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request as rawRequest } from 'node:http';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createHttpServer } from './http.mjs';
import { createTokenVerifier } from './token-verifier.mjs';

const {privateKey,publicKey}=await generateKeyPair('ES256');
const jwk={...await exportJWK(publicKey),kid:'pilot-key',alg:'ES256'};
const issuer='https://issuer.example.test/neo',audience='https://connect.example.test/mcp';
const revoked=new Set();
const verifier=createTokenVerifier({issuer,audience,keySet:createLocalJWKSet({keys:[jwk]}),isRevoked:async({tokenId})=>revoked.has(tokenId)});
async function token({subject='alice',iss=issuer,aud=audience,scope='connect:read devices:read',id=crypto.randomUUID(),exp='3m',key=privateKey}={}){
 return new SignJWT({scope}).setProtectedHeader({alg:'ES256',kid:'pilot-key'}).setSubject(subject).setIssuer(iss).setAudience(aud).setIssuedAt().setJti(id).setExpirationTime(exp).sign(key);
}
async function listen(t,options){
 const server=createHttpServer(options);server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(resolve=>{server.closeAllConnections();server.close(resolve);}));
 return 'http://127.0.0.1:'+server.address().port;
}
function options(store){return{verifyAccessToken:verifier,authorization:{issuer,resource:audience},store};}
async function connect(t,url,accessToken){
 const client=new Client({name:'noogle-gate3-integration',version:'1.0.0'});
 await client.connect(new StreamableHTTPClientTransport(new URL(url+'/mcp'),{requestInit:{headers:{Authorization:'Bearer '+accessToken}}}));
 t.after(()=>client.close());return client;
}
test('default runtime is locked; health never claims MCP or device readiness',async t=>{
 const url=await listen(t,{});
 const health=await fetch(url+'/healthz');assert.equal(health.status,200);
 const state=await health.json();assert.equal(state.mode,'locked-staging');assert.equal(state.deviceReadAdapterConfigured,false);
 for(const path of ['/mcp','/readyz','/.well-known/oauth-protected-resource']){
  const response=await fetch(url+path,{method:path==='/mcp'?'POST':'GET',headers:{Authorization:'Bearer forged'}});
  assert.equal(response.status,503);
 }
});
test('real SDK HTTP client negotiates protocol, discovers tools and reads only its owner',async t=>{
 const seen=[];
 const store={list:async subject=>{seen.push(subject);return[{id:subject+'-phone',label:'Phone',type:'android',publicKeyHash:'secret-store-field'}];}};
 const url=await listen(t,options(store));
 const metadata=await(await fetch(url+'/.well-known/oauth-protected-resource')).json();
 assert.equal(metadata.resource,audience);assert.deepEqual(metadata.authorization_servers,[issuer]);
 for(const subject of ['alice','bob']){
  const client=await connect(t,url,await token({subject}));
  const listing=await client.listTools();assert.equal(listing.tools.length,4);
  const result=await client.callTool({name:'noogle_list_devices',arguments:{}});
  assert.equal(result.structuredContent.devices[0].id,subject+'-phone');
  assert.equal(JSON.stringify(result).includes('secret-store-field'),false);
  const guide=await client.callTool({name:'noogle_connection_guide',arguments:{platform:'phone'}});
  assert.equal(guide.structuredContent.connected,false);
 }
 assert.deepEqual(seen,['alice','bob']);
});
test('wrong audience/issuer, expired, revoked or tampered tokens are denied before store reads',async t=>{
 let reads=0;const url=await listen(t,options({list:async()=>{reads++;return[];}}));
 const revokedToken=await token({id:'revoked-test'});revoked.add('revoked-test');
 const valid=await token(),tampered=valid.slice(0,valid.lastIndexOf('.')+1)+'AAAA';
 const otherKey=(await generateKeyPair('ES256')).privateKey;
 for(const accessToken of [await token({aud:'https://other.example.test'}),await token({iss:'https://other.example.test'}),await token({exp:'-1s'}),revokedToken,tampered,await token({key:otherKey})]){
  const response=await fetch(url+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:'{}'});
  assert.equal(response.status,401);assert.ok(response.headers.get('www-authenticate').includes('resource_metadata='));
 }
 assert.equal(reads,0);
});
test('scope upgrade returns MCP authentication metadata and no device data',async t=>{
 let reads=0;const url=await listen(t,options({list:async()=>{reads++;return[];}}));
 const client=await connect(t,url,await token({scope:'connect:read'}));
 const result=await client.callTool({name:'noogle_list_devices',arguments:{}});
 assert.equal(result.isError,true);assert.ok(result._meta['mcp/www_authenticate'][0].includes('devices:read'));
 assert.equal(reads,0);
});
test('rejects hostile origins, host rebinding, missing scope and oversized bodies',async t=>{
 const url=await listen(t,options());const accessToken=await token();
 assert.equal((await fetch(url+'/healthz',{headers:{Origin:'https://evil.example'}})).status,403);
 const hostStatus=await new Promise((resolve,reject)=>{
  const req=rawRequest(url+'/healthz',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});
  req.on('error',reject);req.end();
 });
 assert.equal(hostStatus,403);
 assert.equal((await fetch(url+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+await token({scope:'devices:read'})}})).status,403);
 assert.equal((await fetch(url+'/mcp',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},body:'a'.repeat(65537)})).status,413);
});
test('account override and database failure never return device success',async t=>{
 let reads=0;const url=await listen(t,options({list:async()=>{reads++;throw Error('private-db-details');}}));
 const client=await connect(t,url,await token());
 const forged=await client.callTool({name:'noogle_list_devices',arguments:{subject:'victim'}});
 assert.equal(forged.isError,true);assert.equal(reads,0);
 const failed=await client.callTool({name:'noogle_list_devices',arguments:{}});
 assert.equal(failed.isError,true);assert.equal(reads,1);assert.equal(JSON.stringify(failed).includes('private-db-details'),false);
});
test('verifier requires a definitive revocation result and rejects overlong lifetime',async()=>{
 const unknownRevocation=createTokenVerifier({issuer,audience,keySet:createLocalJWKSet({keys:[jwk]}),isRevoked:async()=>undefined});
 await assert.rejects(unknownRevocation(await token()),/revoked_or_unverified/);
 await assert.rejects(verifier(await token({exp:'10m'})),/invalid_access_token/);
 assert.throws(()=>createTokenVerifier({issuer:'http://issuer.test',audience,keySet:()=>{},isRevoked:async()=>false}),/https_identity/);
});
