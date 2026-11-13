import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoinbaseLocalGateway} from './local-gateway.mjs';

const key='a'.repeat(48);
const valid={provider:'coinbase',service:'neo-bank',action:'quote',asset:'BTC',network:'bitcoin',reference:'sandbox_1'};

async function running(config, fn) {
 const gateway=createCoinbaseLocalGateway({enabled:true,killSwitch:false,authToken:key,onAudit:async()=>{},...config});
 const base=await gateway.start();
 try{return await fn(base)}finally{await gateway.stop()}
}
function request(base, body=valid, token=key) {
 return fetch(base+'/v1/preview',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(body)});
}

test('hard kill-switch and dedicated credentials are required',()=>{
 assert.throws(()=>createCoinbaseLocalGateway(),/disabled/);
 assert.throws(()=>createCoinbaseLocalGateway({enabled:true}),/disabled/);
 assert.throws(()=>createCoinbaseLocalGateway({enabled:true,killSwitch:false,authToken:'short',onAudit:()=>{}}),/auth/);
 assert.throws(()=>createCoinbaseLocalGateway({enabled:true,killSwitch:false,authToken:key}),/audit/);
});

test('loopback-only preview serves no executable transactions',async()=>running({},async base=>{
 assert.match(base,/^http:\/\/127\.0\.0\.1:/);
 const h=await fetch(base+'/healthz');assert.equal(h.status,200);
 const response=await request(base);assert.equal(response.status,200);
 const value=await response.json();assert.equal(value.executable,false);
 assert.equal(value.mode,'offline-simulation');
 assert.equal((await fetch(base+'/v1/preview')).status,404);
 assert.equal((await fetch(base+'/admin')).status,404);
}));

test('authentication, origin, missing network and ETH-related assets are blocked',async()=>running({},async base=>{
 assert.equal((await request(base,valid,'wrong')).status,401);
 assert.equal((await request(base,{...valid,network:'base'})).status,400);
 assert.equal((await request(base,{...valid,asset:'cbBTC'})).status,400);
 assert.equal((await request(base,{...valid,action:'transfer'})).status,400);
 assert.equal((await fetch(base+'/v1/preview',{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'application/json',origin:'https://example.com'},body:JSON.stringify(valid)})).status,403);
}));

test('fail-closed audit and request-limit protections',async()=>running({onAudit:()=>{throw new Error('audit_unavailable')},maxRequestsPerMinute:2},async base=>{
 assert.equal((await request(base)).status,400);
 assert.equal((await request(base)).status,400);
 assert.equal((await request(base)).status,429);
}));

test('strict JSON content and no secret-bearing payloads',async()=>running({},async base=>{
 const result=await request(base,{...valid,privateKey:'secret'});
 assert.equal(result.status,400);
 assert.doesNotMatch(await result.text(),/secret/);
 const unsupported=await fetch(base+'/v1/preview',{method:'POST',headers:{authorization:'Bearer '+key,'content-type':'text/plain'},body:'hello'});
 assert.equal(unsupported.status,400);
}));
