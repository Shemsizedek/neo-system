import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeIssuanceEvidence,counterpartyIssuanceReadUrls} from './issuance-history-proof.mjs';
const issuer='1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk';
const v2='https://api.counterparty.io:4000/v2/assets/NOMNI/issuances';
const ts='https://tokenscan.io/api/issuances/NOMNI/1/100';
const now='2026-11-08T23:00:00Z';
const tx=n=>String(n).padStart(64,'a');
const row=(num,quantity,divisible=false)=>({asset:'NOMNI',tx_hash:tx(num),block_index:450000+num,status:'valid',quantity,divisible,issuer,source:issuer,locked:false,transfer:false});
test('TokenScan indivisible quantity with decimal zeros maps to exact whole base units',()=>{
 const r=analyzeIssuanceEvidence({asset:'NOMNI',pages:[{sourceUrl:ts,retrievedAt:now,payload:{data:[row(1,'900000000.00000000')],total:1}}]});
 assert.equal(r.quantityFromSuppliedValidRowsBaseUnits,'900000000');
 assert.equal(r.sourceEvidence[0].provider,'tokenscan');
 assert.equal(r.transactions[0].quantityEncoding,'human-units-decimal');
 assert.equal(r.bitcoinConfirmationsIndependentlyValidated,false);
});
test('TokenScan divisible asset human-unit decimal maps to 8-decimal integer units',()=>{
 const r=analyzeIssuanceEvidence({asset:'NOMNI',pages:[{sourceUrl:ts,retrievedAt:now,payload:{data:[row(1,'1.25000000',true)]}}]});
 assert.equal(r.quantityFromSuppliedValidRowsBaseUnits,'125000000');
});
test('same quantity string from v2 remains raw units; never scale twice',()=>{
 const r=analyzeIssuanceEvidence({asset:'NOMNI',pages:[{sourceUrl:v2,retrievedAt:now,payload:{result:[row(1,'125000000',true)]}}]});
 assert.equal(r.quantityFromSuppliedValidRowsBaseUnits,'125000000');
 assert.equal(r.transactions[0].quantityEncoding,'base-units-integer');
});
test('indivisible fractional TokenScan issuance explicitly rejected',()=>{
 assert.throws(()=>analyzeIssuanceEvidence({asset:'NOMNI',pages:[{sourceUrl:ts,retrievedAt:now,payload:{data:[row(1,'1.5')]}}]}),/Indivisible/);
});
test('TokenScan quantities above 8 decimals rejected',()=>{
 assert.throws(()=>analyzeIssuanceEvidence({asset:'NOMNI',pages:[{sourceUrl:ts,retrievedAt:now,payload:{data:[row(1,'1.123456789',true)]}}]}),/decimal human/);
});
test('off-domain endpoints and query parameters cannot be used as audit provenance',()=>{
 for(const sourceUrl of [
   'https://evil.example/api/issuances/NOMNI/1/100',
   'https://tokenscan.io.evil.example/api/issuances/NOMNI',
   'https://tokenscan.io/api/issuances/NOMNI?token=secret',
   'https://tokenscan.io/api/issuances/NOMNI/0/100',
   'https://api.counterparty.io:4000/v2/assets/NOMNI/issuances?foo=1'
 ]) {
   assert.throws(()=>analyzeIssuanceEvidence({asset:'NOMNI',pages:[{sourceUrl,retrievedAt:now,payload:{data:[]}}]}),/allowlisted/);
 }
});
test('source total is reported, never converted into completeness certification',()=>{
 const r=analyzeIssuanceEvidence({asset:'NOMNI',pages:[{sourceUrl:ts,retrievedAt:now,payload:{data:[row(1,'200')],total:30},paginationReportedComplete:true}]});
 assert.equal(r.sourceEvidence[0].reportedTotal,30);
 assert.equal(r.completeHistoryVerified,false);
 assert.equal(r.tokenSupplyIndependentlyVerified,false);
});
test('TokenScan zero-quantity lock flag never independently certifies genesis or lock transaction',()=>{
 const r=analyzeIssuanceEvidence({asset:'NOMNI',pages:[{sourceUrl:ts,retrievedAt:now,payload:{data:[row(1,'0')].map(x=>({...x,locked:true}))}}]});
 assert.equal(r.anyLockEventObserved,true);
 assert.equal(r.issuanceLockIndependentlyVerified,false);
 assert.equal(r.tokenSupplyIndependentlyVerified,false);
});
