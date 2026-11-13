import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePublicAssetObservations} from './public-asset-evidence.mjs';
const a='18FyntJG9hdXYvanm67mGgbyo1P7adckvg',b='1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk',c='1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8';
const src='CounterPay public wallet balance';
const row=(address,asset,quantity,locked=false,owner=address,issuer=address)=>({address,asset,quantity,locked,owner,issuer,divisible:false,status:'live',source:src});

test('NOMNI public wallet holdings can sum without certifying supply or legal value',()=>{
  const r=summarizePublicAssetObservations([row(a,'NOMNI','166414131',true,a,b),row(b,'NOMNI','101898388',true,a,b),row(c,'NOMNI','34',true,a,b)]);
  assert.equal(r.assets[0].reportedHoldingsInObservedWallets,'268312553');
  assert.equal(r.assets[0].walletCount,3);
  assert.equal(r.assets[0].issuanceLocked,true);
  assert.equal(r.assets[0].circulatingSupplyVerified,false);
  assert.equal(r.actualMainnetTxidProof,false);
});
test('STANSHARES 1000 in one address must not be called fixed total equity or issued supply',()=>{
  const x=summarizePublicAssetObservations([row(c,'STANSHARES','1000',false)]);
  assert.equal(x.assets[0].reportedHoldingsInObservedWallets,'1000');
  assert.equal(x.assets[0].issuanceLocked,false);
  assert.equal(x.assets[0].economicOrShareholderRightsVerified,false);
  assert.equal(x.assets[0].securityOfferingAuthorized,false);
});
test('KNOWINDEX observed units cannot imply company formation or issuer authority',()=>{
  const x=summarizePublicAssetObservations([row(c,'KNOWINDEX','1000',false)]);
  assert.equal(x.assets[0].priceOrLiquidityVerified,false);
  assert.equal(x.assets[0].tokenIssuanceTransactionVerified,false);
});
test('multiple issuer or ownership reports are a conflict, not a guessed winner',()=>{
  const x=summarizePublicAssetObservations([row(a,'NOMNI','8',true,a,b),row(b,'NOMNI','2',true,b,b)]).assets[0];
  assert.equal(x.conflictingMetadata,true);assert.equal(x.reportedAssetOwner,null);assert.equal(x.certification,'METADATA-CONFLICT');
});
test('duplicated wallet records fail closed',()=>assert.throws(()=>summarizePublicAssetObservations([row(a,'NOMNI','1'),row(a,'NOMNI','1')]),/Duplicate/));
test('reject unexpected credential or unsupported claim fields',()=>assert.throws(()=>summarizePublicAssetObservations([{...row(a,'NOMNI','1'),privateKey:'bad'}]),/Unsupported/));
test('reject forged source status, malformed quantity and invalid addresses',()=>{
 assert.throws(()=>summarizePublicAssetObservations([{...row(a,'NOMNI','1'),status:'verified'}]),/Unsupported/);
 assert.throws(()=>summarizePublicAssetObservations([row(a,'NOMNI','1.5')]),/decimal integer/);
 assert.throws(()=>summarizePublicAssetObservations([row('123','NOMNI','1')]),/address/);
});
test('supports large integer token amounts without floating point truncation',()=>{
 const x=summarizePublicAssetObservations([row(a,'WORLDCREDIT','999999106297930')]);
 assert.equal(x.assets[0].reportedHoldingsInObservedWallets,'999999106297930');
 assert.equal(x.assets[0].reservesOrRedemptionVerified,false);
});
