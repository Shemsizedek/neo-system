import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyNomniValueRecord,rejectCesAsUsdReserves} from './ces-ledger-boundary.mjs';

test('NOMNI blockchain supply and CES unit of account remain distinct',()=>{
  const nomni=classifyNomniValueRecord({sourceSystem:'counterparty',unit:'NOMNI',network:'bitcoin'});
  const ces=classifyNomniValueRecord({sourceSystem:'ces',unit:'NMNI',exchangeId:'NMNI'});
  const vdollar=classifyNomniValueRecord({sourceSystem:'ces',unit:'V-Dollar',exchangeId:'NMNI'});
  assert.equal(nomni.classification,'COUNTERPARTY_NOMNI_ASSET');
  assert.equal(ces.classification,'CES_MUTUAL_CREDIT_BOOK_ENTRY');
  assert.equal(vdollar.classification,'CES_V_DOLLAR_BOOK_ENTRY_UNVERIFIED');
  for(const x of [nomni,ces,vdollar]){
    assert.equal(x.reserveEligibleUsd,false);
    assert.equal(x.redeemedAtUsdOne,false);
    assert.equal(x.valueMovementAuthorized,false);
  }
});

test('rejects attempt to pass CES credit or V-Dollar as onchain NOMNI or cash',()=>{
  for(const x of [
    {sourceSystem:'ces',unit:'NOMNI',exchangeId:'NMNI'},
    {sourceSystem:'ces',unit:'V-Dollar',exchangeId:'NMNI',network:'bitcoin'},
    {sourceSystem:'counterparty',unit:'NOMNI',network:'base'},
    {sourceSystem:'counterparty',unit:'XCP',network:'bitcoin'},
  ])assert.throws(()=>classifyNomniValueRecord(x),/Unknown/);
  for(const item of [
    {sourceSystem:'ces',unit:'VDOLLAR'},
    {sourceSystem:'counterparty',unit:'NOMNI'},
    {sourceSystem:'bank',unit:'BTC'},
    {sourceSystem:'bank',unit:'USD',isSelfAttested:true},
    {asset:'XCP',sourceSystem:'bank'},
  ]) assert.throws(()=>rejectCesAsUsdReserves([item]),/cannot be assumed/);
});

test('even claimed USD reserves remain unverified without an independent audit',()=>{
  const out=rejectCesAsUsdReserves([{sourceSystem:'custodian',unit:'USD',claimedSource:'cash'}]);
  assert.equal(out.eligibleUsdReservesVerified,false);
  assert.equal(out.reviewRequired,true);
});
