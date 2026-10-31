import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {verifySourceObservation,compareCounterpartySources,createUnsignedCrownReceipt} from './source-receipts.mjs';
const now=Date.UTC(2026,9,31);const signer=crypto.generateKeyPairSync('ed25519');
const registry={a:{enabled:true,algorithm:'ed25519',operatorId:'operator-A',publicKeyPem:signer.publicKey.export({type:'spki',format:'pem'})}};
const canonical = v => JSON.stringify(v,Object.keys(v).sort());
const payload={asset:'NOMNI',quantity:'100',blockHash:'a'.repeat(64),blockHeight:100};
function signed(payloadOverride=payload){const o={sourceId:'a',payload:payloadOverride,observedAt:now,validUntil:now+300000,signedAt:'2026-10-31T00:00:00Z'};
 return {...o,signature:crypto.sign(null,Buffer.from(canonical(o)),signer.privateKey).toString('base64')};}
test('valid source signature is not blockchain certification',()=>{let r=verifySourceObservation({observation:signed(),registry,now});assert.equal(r.status,'SIGNED_SOURCE_RECORDED');assert.equal(r.independentChainVerification,false)});
test('altered observation is rejected',()=>{let o=signed();o.payload={...payload,quantity:'999'};assert.equal(verifySourceObservation({observation:o,registry,now}).status,'HOLD')});
test('stale signed record rejected',()=>{let o=signed();assert.equal(verifySourceObservation({observation:o,registry,now:now+700000}).status,'HOLD')});
test('same operator cannot count twice',()=>{let a=verifySourceObservation({observation:signed(),registry,now});assert.equal(compareCounterpartySources([a,a]).status,'HOLD')});
test('different operators with inconsistent claims rejected',()=>{let a={status:'SIGNED_SOURCE_RECORDED',operatorId:'a',payload};let b={status:'SIGNED_SOURCE_RECORDED',operatorId:'b',payload:{...payload,quantity:'101'}};assert.equal(compareCounterpartySources([a,b]).status,'HOLD')});
test('two matching operator observations remain unverified consensus',()=>{let a={status:'SIGNED_SOURCE_RECORDED',operatorId:'a',payload};let b={status:'SIGNED_SOURCE_RECORDED',operatorId:'b',payload};let r=compareCounterpartySources([a,b]);assert.equal(r.status,'SIGNED_SOURCES_CONSISTENT');assert.equal(r.bitcoinConsensusVerified,false)});
test('Crown receipt must be unsigned and non-executing',()=>{let a={status:'SIGNED_SOURCE_RECORDED',operatorId:'a',payload};let b={status:'SIGNED_SOURCE_RECORDED',operatorId:'b',payload};let s=compareCounterpartySources([a,b]);let r=createUnsignedCrownReceipt({caseId:'CASE-123',sourceResult:s,reviewer:{id:'professional-1',role:'auditor'}});assert.equal(r.status,'UNSIGNED_CROWN_RECEIPT');assert.equal(r.attested,false);assert.equal(r.transferEnabled,false)});
