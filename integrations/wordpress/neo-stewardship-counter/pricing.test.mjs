import assert from 'node:assert/strict';
import {quoteStewardship as quote} from './pricing.mjs';
const fixture={asset:'PLEDGEBOND',currency:'BTC',quantity:'2',unitPriceMinor:'1000',feeAllowanceMinor:'150',spreadBps:'100',processorFeeBps:'290',roundingMinor:'100',source:'TEST FIXTURE ONLY',referenceId:'fixture-1',observedAt:1000,expiresAt:301000};
const q=quote(fixture,2000);
assert.equal(q.totalMinor,'2300');
assert.equal(q.marketSubtotalMinor,'2000');
assert.equal(q.spreadMinor,'20');
assert.equal(q.processorFeeMinor,'67');
assert.equal(q.roundingAdjustmentMinor,'63');
assert.equal(q.payable,false);
for(const patch of [{quantity:'0'},{quantity:'1.5'},{unitPriceMinor:'0'},{processorFeeBps:'10000'},{asset:'FAKE'},{expiresAt:1000},{observedAt:3000},{referenceId:''},{spreadBps:'-1'}]) assert.throws(()=>quote({...fixture,...patch},2000));
assert.throws(()=>quote(fixture,301001));
for(let i=0;i<100;i++){
 const v=quote({...fixture,quantity:String(i+1),processorFeeBps:String(i*83),roundingMinor:String(i+1)},2000);
 assert(BigInt(v.totalMinor)-BigInt(v.processorFeeMinor)>=BigInt(v.marketSubtotalMinor)+BigInt(v.spreadMinor)+BigInt(v.feeAllowanceMinor));
}
console.log('PASS: itemized quote, fee gross-up, rounding, expiry, invalid input and 100 fee-coverage scenarios');
