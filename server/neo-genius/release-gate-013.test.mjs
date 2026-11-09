import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBitcoinReserve} from './readonly-reserve.mjs';
import {analyzeIssuanceEvidence} from './issuance-history-proof.mjs';

const treasury='18FyntJG9hdXYvanm67mGgbyo1P7adckvg';
const issuer='1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk';
const snapshot=address=>({
  address,confirmedSats:'125000000',
  source:{url:'https://example.org/node/1000000',retrievedAt:'2026-11-09T13:00:00Z',blockHeight:1000000,evidenceClass:'independent-node-observation'}
});

test('same Bitcoin address cannot double-count reported holdings',()=>{
  assert.throws(
    ()=>assessBitcoinReserve({walletSnapshots:[snapshot(treasury),snapshot(treasury)]}),
    /Duplicate wallet address/
  );
});

test('two different addresses can be mathematically aggregated but never certified',()=>{
  const r=assessBitcoinReserve({walletSnapshots:[snapshot(treasury),snapshot(issuer)]});
  assert.equal(r.totalConfirmedSats,'250000000');
  assert.equal(r.totalBTC,'2.50000000');
  assert.equal(r.certification.reserveAttested,false);
  assert.equal(r.certification.chainIndependentlyValidated,false);
});

test('reported Counterparty locked field is not an authenticated lock-event transaction',()=>{
  const row={asset:'NOMNI',tx_hash:'a'.repeat(64),block_index:458112,
    quantity:'900000000',divisible:false,status:'valid',issuer,source:issuer,locked:true};
  const result=analyzeIssuanceEvidence({asset:'NOMNI',pages:[{
    sourceUrl:'https://api.counterparty.io:4000/v2/assets/NOMNI/issuances',
    retrievedAt:'2026-11-09T13:00:00Z',payload:{result:[row]}
  }]});
  assert.equal(result.anyLockFieldReported,true);
  assert.equal(result.anyLockEventObserved,false);
  assert.equal(result.issuanceLockIndependentlyVerified,false);
  assert.equal(result.bitcoinConfirmationsIndependentlyValidated,false);
  assert.equal(result.tokenSupplyIndependentlyVerified,false);
});
