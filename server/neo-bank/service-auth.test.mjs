import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,randomUUID} from 'node:crypto';
import {authenticateTellerService,validateCrownReceipt} from './service-auth.mjs';
const secret='a-test-only-service-key-more-than-thirty-two-characters';
test('Teller service MAC covers exact method path timestamp nonce and body',()=>{
 const req={method:'POST',path:'/api/v1/bank/teller/assertions/consume',body:'{"id":"x"}',timestamp:10000,nonce:randomUUID()};
 req.signature=createHmac('sha256',secret).update([req.method,req.path,req.timestamp,req.nonce,req.body].join('\n')).digest('hex');
 assert.equal(authenticateTellerService(req,{secret,now:()=>10000}).authorized,true);
 assert.throws(()=>authenticateTellerService({...req,body:'{"id":"y"}'},{secret,now:()=>10000}),/teller_service_invalid/);
 assert.throws(()=>authenticateTellerService(req,{secret,now:()=>100000}),/teller_service_invalid/);
});
test('external Crown receipt requires independent verification',()=>{
 const receipt=validateCrownReceipt({digest:'sha256:'+'a'.repeat(64),txid:'b'.repeat(64),network:'bitcoin-mainnet',confirmed:true});
 assert.equal(receipt.verified,false);assert.equal(receipt.confirmed,false);
});
