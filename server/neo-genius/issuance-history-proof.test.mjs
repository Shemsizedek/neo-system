import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeIssuanceEvidence,counterpartyIssuanceReadUrls} from './issuance-history-proof.mjs';
const tx=n=>n.toString(16).padStart(64,'0');
const url='https://api.counterparty.io:4000/v2/assets/NOMNI/issuances';
const retrievedAt='2026-11-08T22:20:00Z';
const source='1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk';
const rec=(num,quantity,extra={})=>({asset:'NOMNI',tx_hash:tx(num),block_index:420000+num,quantity,status:'valid',issuer:source,source,divisible:false,...extra});
const page=(rows,more={})=>({sourceUrl:url,retrievedAt,payload:{result:rows},...more});

test('official Counterparty API read endpoints are fixed GET-only lookup targets',()=>{
  const x=counterpartyIssuanceReadUrls('NOMNI');
  assert.equal(x.length,2);
  assert.match(x[0],/\/v2\/assets\/NOMNI\/issuances$/);
  assert.match(x[1],/\/api\/issuances\/NOMNI$/);
});
test('a supplied NOMNI history is a candidate, never independently attested',()=>{
  const result=analyzeIssuanceEvidence({asset:'NOMNI',pages:[page([rec(1,'900000000'),rec(2,'0',{lock:true})])]});
  assert.equal(result.quantityFromSuppliedValidRowsBaseUnits,'900000000');
  assert.equal(result.firstObservedIssuance.txHash,tx(1));
  assert.equal(result.anyLockFieldReported,true);
  assert.equal(result.anyLockEventObserved,false);
  assert.equal(result.tokenSupplyIndependentlyVerified,false);
  assert.equal(result.bitcoinConfirmationsIndependentlyValidated,false);
  assert.equal(result.legalStablecoinOrSecuritiesComplianceVerified,false);
  assert.equal(result.status,'UNVERIFIED-API-EVIDENCE');
});
test('a duplicate transaction across paged sources is flagged, not double counted',()=>{
  const result=analyzeIssuanceEvidence({asset:'NOMNI',pages:[page([rec(1,'99')]),page([rec(1,'99')])]});
  assert.equal(result.quantityFromSuppliedValidRowsBaseUnits,'99');
  assert.match(result.problems.join(' '),/Repeated transaction/);
});
test('invalid Counterparty issuance is excluded from tentative quantity',()=>{
  const result=analyzeIssuanceEvidence({asset:'NOMNI',pages:[page([rec(1,'4'),rec(2,'500',{status:'invalid'})])]});
  assert.equal(result.quantityFromSuppliedValidRowsBaseUnits,'4');
  assert.equal(result.reportedValidTransactions,1);
  assert.equal(result.status,'PARTIAL-OR-CONFLICTING-RECORDS');
});
test('transfer event never mints additional quantity in tentative sum',()=>{
  const result=analyzeIssuanceEvidence({asset:'NOMNI',pages:[page([rec(1,'8'),rec(2,'0',{transfer:true})])]});
  assert.equal(result.quantityFromSuppliedValidRowsBaseUnits,'8');
  assert.equal(result.anyIssuerTransferObserved,true);
});
test('wrong asset and broken txid are rejected as evidence rather than invented',()=>{
  const result=analyzeIssuanceEvidence({asset:'NOMNI',pages:[page([{...rec(1,'10'),asset:'OTHER'},rec(2,'2',{tx_hash:'BAD'})])]});
  assert.equal(result.reportedValidTransactions,0);
  assert.equal(result.firstObservedIssuance,null);
  assert.ok(result.problems.length>=2);
});
test('malformed quantity, unsafe integer and oversized values fail closed',()=>{
  assert.throws(()=>analyzeIssuanceEvidence({asset:'NOMNI',pages:[page([rec(1,'1.5')])]}),/integer base-unit/);
  assert.throws(()=>analyzeIssuanceEvidence({asset:'NOMNI',pages:[page([rec(1,Number.MAX_SAFE_INTEGER+10)])]}),/integer base-unit/);
  assert.throws(()=>analyzeIssuanceEvidence({asset:'NOMNI',pages:[page([rec(1,'1'+'0'.repeat(31))])]}),/evidence bound/);
});
test('malformed endpoint, asset name or bad envelope do not get approved',()=>{
  assert.throws(()=>analyzeIssuanceEvidence({asset:'nomni',pages:[page([])]}),/Invalid Counterparty asset/);
  assert.throws(()=>analyzeIssuanceEvidence({asset:'NOMNI',pages:[{...page([]),sourceUrl:'http://evil.com/v2/assets/NOMNI/issuances'}]}),/HTTPS/);
  assert.throws(()=>analyzeIssuanceEvidence({asset:'NOMNI',pages:[{...page([]),payload:{message:'offline'}}]}),/issuance array unavailable/i);
});
test('disagreement in divisible field is surfaced without defining legal rights',()=>{
  const r=analyzeIssuanceEvidence({asset:'NOMNI',pages:[page([rec(1,'3'),rec(2,'2',{divisible:true})])]});
  assert.ok(r.problems.some(x=>x.includes('divisibility')));
  assert.equal(r.divisibleObserved,null);
  assert.equal(r.legalIssuerOrShareholderRightsVerified,false);
});
test('STANSHARES and KNOWINDEX empty pages do not imply asset nonexistent',()=>{
  for(const asset of ['STANSHARES','KNOWINDEX']){
    const u='https://api.counterparty.io:4000/v2/assets/'+asset+'/issuances';
    const r=analyzeIssuanceEvidence({asset,pages:[{sourceUrl:u,retrievedAt,payload:{result:[]}}]});
    assert.equal(r.reportedValidTransactions,0);
    assert.equal(r.completeHistoryVerified,false);
    assert.equal(r.governmentReserveEligible,false);
  }
});
