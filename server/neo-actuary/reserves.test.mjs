import test from 'node:test';
import assert from 'node:assert/strict';
import {treasuryReserveLadder} from './reserves.mjs';
const r=(id,amountMinor,restriction='unrestricted',day='2026-10-30')=>({id,currency:'USD',amountMinor,verified:true,evidenceId:'e-'+id,fundId:'trust',restriction,authorizedPurpose:restriction==='restricted'?'beneficiary-relief':undefined,availableOn:day,dueOn:day});
const base={asOf:'2026-10-24',currency:'USD',assets:[r('cash','10000'),r('reserved','5000','restricted')],liabilities:[r('general','12000')]};
test('restricted assets never offset unrestricted obligation',()=>{
 const m=treasuryReserveLadder(base);
 assert.equal(m.horizons.find(h=>h.days===7).funds[0].unrestrictedShortfallMinor,'2000');
 assert.equal(m.horizons.find(h=>h.days===7).funds[0].restrictedNotFungibleMinor,'5000');
 assert.equal(m.aggregate.observed.netMinor,'3000');
});
test('funds and maturities stay separated',()=>{
 const m=treasuryReserveLadder({...base,assets:[r('cash','10000','unrestricted','2026-11-30')],liabilities:[r('general','12000')]});
 assert.equal(m.horizons.find(h=>h.days===7).funds[0].availableUnrestrictedMinor,'0');
});
test('reject unverified, mixed units and bad dates',()=>{
 assert.throws(()=>treasuryReserveLadder({...base,assets:[{...base.assets[0],verified:false}]}),/Verified/);
 assert.throws(()=>treasuryReserveLadder({...base,assets:[{...base.assets[0],currency:'BTC'}]}),/Verified/);
 assert.throws(()=>treasuryReserveLadder({...base,asOf:'2026-02-30'}),/date/);
});
