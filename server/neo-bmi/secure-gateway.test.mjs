import test from 'node:test';import assert from 'node:assert/strict';import {createSecureEvidenceGateway} from './secure-gateway.mjs';
const tx='a'.repeat(64),block='b'.repeat(64),events=[];
const bitcoin={getTransaction:async()=>({confirmed:true,canonical:true,blockhash:block}),recheckAnchor:async()=>({confirmed:true,canonical:true,blockhash:block,confirmations:6})};
const counterparty={getIssuance:async()=>({asset:'TEST',tx_hash:tx})};
async function run(config,fn){const server=createSecureEvidenceGateway({bitcoin,counterparty,allowedAssets:['TEST'],historyStore:{append:async e=>events.push(e),list:async()=>events},...config});await new Promise(r=>server.listen(0,'127.0.0.1',r));try{await fn('http://127.0.0.1:'+server.address().port)}finally{await new Promise(r=>server.close(r))}}
test('denies unauthenticated evidence and health',()=>run({authorize:async()=>({allowed:false})},async url=>{assert.equal((await fetch(url+'/health')).status,401);assert.equal((await fetch(url+'/v1/evidence?asset=TEST&txid='+tx)).status,401)}));
test('authorizes read and records evidence',()=>run({authorize:async()=>({allowed:true,subject:'operator1'})},async url=>{const r=await fetch(url+'/v1/evidence?asset=TEST&txid='+tx);assert.equal(r.status,200);assert.equal((await r.json()).legalRights,'NOT_VERIFIED')}));
test('fails closed when audit unavailable',()=>run({authorize:async()=>({allowed:true,subject:'operator1'}),historyStore:{append:async()=>{throw Error('down')},list:async()=>[]}},async url=>assert.equal((await fetch(url+'/v1/evidence?asset=TEST&txid='+tx)).status,503)));
test('returns history only to authenticated operators',()=>run({authorize:async()=>({allowed:true,subject:'operator1'})},async url=>assert.equal((await fetch(url+'/v1/history?asset=TEST&txid='+tx)).status,200)));
