import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeNeoTeleFunding} from './operator-ledger.mjs';
test('calculate proposed monthly coverage in cents',()=>{
 const x=summarizeNeoTeleFunding({pilotLines:2,entries:[{id:'a',type:'COMMITMENT',amountCents:2000,evidenceRef:'grant-1'},{id:'b',type:'OBLIGATION',amountCents:2400,evidenceRef:'quote-1'}]});
 assert.equal(x.monthlyGapCents,400);assert.equal(x.provisioningEnabled,false);
});
test('reject duplicate entries and missing evidence',()=>{
 assert.throws(()=>summarizeNeoTeleFunding({entries:[{id:'a',type:'COMMITMENT',amountCents:1,evidenceRef:'x'},{id:'a',type:'OBLIGATION',amountCents:2,evidenceRef:'y'}]}),/invalid_or_duplicate/);
 assert.throws(()=>summarizeNeoTeleFunding({entries:[{id:'b',type:'COMMITMENT',amountCents:1}]}),/ledger_evidence_required/);
});
