import test from 'node:test';
import assert from 'node:assert/strict';
import {assessCesVDollarAccountStatement} from './ces-account-reconciliation.mjs';
const example={sourceSystem:'ces',unit:'VDOLLAR',statementReference:'evidence:historical_ces_2019',
 opening:'100.00',tradeCredits:'20.00',clearedDepositCredits:'25.00',
 tradeDebits:'12.00',usdRedemptionDebits:'3.00',closing:'130.00'};
test('account arithmetic recognizes trading credits and deposit credits separately',()=>{
 const r=assessCesVDollarAccountStatement(example);
 assert.equal(r.reportedClosingCents,'13000');
 assert.equal(r.reportedTradeCreditCents,'2000');
 assert.equal(r.reportedClearedDepositCreditCents,'2500');
 assert.equal(r.authenticatedLiveCESBalanceVerified,false);
 assert.equal(r.independentlyConfirmedCustodianCash,false);
 assert.equal(r.eligibleNomniUsdBackingVerified,false);
});
test('unfunded credits, malformed amounts, PII and unknown currency are rejected',()=>{
 for(const x of [
 {closing:'130.01'},{unit:'NOMNI'},{bankAccountNumber:'000111'},{opening:'1e12'},
 {tradeCredits:-3},{tradeDebits:'200.00'},{statementReference:'name@example.com'},
 ])assert.throws(()=>assessCesVDollarAccountStatement({...example,...x}));
});
