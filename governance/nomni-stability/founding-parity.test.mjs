import test from 'node:test';
import assert from 'node:assert/strict';
import {assessNomniOneToOneEvidence} from './founding-parity.mjs';
const ref={context:'CES_V_DOLLAR_BOOK_UNIT_PARITY',baseUnit:'NOMNI',quoteUnit:'VDOLLAR',numerator:'1',denominator:'1',sourceStatus:'HISTORICAL_AUTHOR_ASSERTION',sourceDocumentReference:'NOMNI_HISTORY_2019'};
test('historical one-to-one credit units do not imply a dollar bank deposit',()=>{
 const record=assessNomniOneToOneEvidence(ref);
 assert.equal(record.nominalRatio,'1:1');
 assert.equal(record.historicalUnitParityRecorded,true);
 assert.equal(record.usdReserveVerified,false);
 assert.equal(record.cashRedemptionAuthorized,false);
 assert.equal(record.liveCESBalanceVerified,false);
});
test('a USD redemption proposal stays disabled even if rate is stated 1:1',()=>{
 const r=assessNomniOneToOneEvidence({...ref,context:'USD_CASH_REDEMPTION',quoteUnit:'USD'});
 assert.equal(r.historicalUnitParityRecorded,false);
 assert.equal(r.cashRedemptionAuthorized,false);
 assert.equal(r.review,'SOURCE_AND_LEGAL_VERIFICATION_REQUIRED');
});
test('fails closed for missing conversion units, unknown rate or account data',()=>{
 for(const change of [{quoteUnit:undefined},{context:'ethereum'},{numerator:'3'}, {bankAccountNumber:'1234'},{sourceStatus:'UNVERIFIED'},{sourceDocumentReference:'https://private.account'}]){
  assert.throws(()=>assessNomniOneToOneEvidence({...ref,...change}));
 }
});
