import test from 'node:test';import assert from 'node:assert/strict';import {createEvidenceGateway} from './gateway.mjs';
const tx='a'.repeat(64),block='b'.repeat(64);
const bitcoin={getTransaction:async()=>({txid:tx,confirmed:true,canonical:true,blockhash:block}),recheckAnchor:async()=>({txid:tx,confirmed:true,canonical:true,blockhash:block,confirmations:6})};
const counterparty={getIssuance:async()=>({asset:'TEST',tx_hash:tx})};
async function withGateway(fn,opts={}){const s=createEvidenceGateway({bitcoin,counterparty,allowedAssets:['TEST'],...opts});await new Promise(r=>s.listen(0,'127.0.0.1',r));try{return await fn('http://127.0.0.1:'+s.address().port)}finally{await new Promise(r=>s.close(r))}}
test('read-only staging health',()=>withGateway(async u=>{const v=await(await fetch(u+'/health')).json();assert.equal(v.productionReady,false)}));
test('correlates evidence but does not certify collateral',()=>withGateway(async u=>{const v=await(await fetch(u+'/v1/evidence?asset=TEST&txid='+tx)).json();assert.equal(v.status,'PROVIDER_EVIDENCE_CORRELATED');assert.equal(v.legalRights,'NOT_VERIFIED')}));
test('rejects invalid identifiers',()=>withGateway(async u=>{assert.equal((await fetch(u+'/v1/evidence?asset=TEST&txid=no')).status,400)}));
test('rejects write methods',()=>withGateway(async u=>{assert.equal((await fetch(u+'/health',{method:'POST'})).status,405)}));
test('upstream outage fails closed',()=>withGateway(async u=>{assert.equal((await fetch(u+'/v1/evidence?asset=TEST&txid='+tx)).status,503)},{bitcoin:{...bitcoin,getTransaction:async()=>{throw Error('offline')}}}));
