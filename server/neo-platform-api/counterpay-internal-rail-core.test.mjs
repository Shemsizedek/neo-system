import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareCounterpayInternalBatch} from './counterpay-internal-rail-core.mjs';
const ids = ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'];
const digest = c => c.repeat(64);
const entries = [
  {recordRef:ids[0],recordClass:'COURT_FILING',privacy:'RESTRICTED',commitment:digest('a')},
  {recordRef:ids[1],recordClass:'MEDICAL',privacy:'HIGHLY_RESTRICTED',commitment:digest('b')},
];
function prepareAnchor({commitments}) {
  const root = digest('f');
  return {root,state:'prepared_offchain',anchored:false,broadcastEnabled:false,crownAuthorized:false,transactionId:null,
    counterpartyBroadcastText:`NEO:eGAAS:1:${root}`,proofs:commitments.map(c=>({commitment:c,proof:[{side:'right',hash:digest('e')}]}))};
}
const run = x => prepareCounterpayInternalBatch(x, {prepareAnchor});
test('prepares private internal rail with per-record proof and no on-chain status claim',()=>{
  const result=run({entries});
  assert.equal(result.receipts.length,2);
  assert.equal(result.receipts[1].recordClass,'MEDICAL');
  assert.equal(result.anchoring.verified,false);
  assert.equal(result.anchoring.transactionId,null);
  assert.equal(result.operations.broadcast,false);
  assert.equal(result.operations.payment,false);
  assert.equal(result.operations.vmExecution,false);
  assert.deepEqual(result.receipts.map(x=>x.commitment),[digest('a'),digest('b')]);
});
test('rejects personal data and extraneous authority or document fields',()=>{
  for(const invalid of [
    {entries,patient:'Jane Doe'}, {entries:[{...entries[0],caseNumber:'2026-XYZ'}]},
    {entries:[{...entries[0],anchored:true}]}, {entries:[{...entries[0],phone:'123456'}]},
    {entries:[{...entries[0],walletSeed:'secret'}]}
  ]) assert.throws(()=>run(invalid));
});
test('rejects duplicate record references, commitments, unknown kinds, and wrong sensitivity',()=>{
  for(const invalid of [
    [entries[0],entries[0]], [entries[0],{...entries[1],commitment:entries[0].commitment}],
    [{...entries[0],recordClass:'UNREGISTERED'}],
    [{...entries[1],privacy:'RESTRICTED'}],
    [{...entries[0],recordRef:'a-real-name'}]
  ]) assert.throws(()=>run({entries:invalid}));
});
test('rejects empty, oversized batches and malformed commitments',()=>{
  assert.throws(()=>run({entries:[]}));
  assert.throws(()=>run({entries:Array.from({length:129},(_,i)=>({...entries[0],recordRef:`${String(i).padStart(8,'0')}-1111-4111-8111-111111111111`,commitment:i.toString(16).padStart(64,'0')}))}));
  assert.throws(()=>run({entries:[{...entries[0],commitment:'not-a-commitment'}]}));
});
test('rejects unsupported or falsely verified anchor preparer',()=>{
  assert.throws(()=>prepareCounterpayInternalBatch({entries},{prepareAnchor:()=>({state:'confirmed'})}),/contract_violation/);
  assert.throws(()=>prepareCounterpayInternalBatch({entries},{prepareAnchor:()=>({...prepareAnchor({commitments:entries.map(x=>x.commitment)}),broadcastEnabled:true})}),/contract_violation/);
  assert.throws(()=>prepareCounterpayInternalBatch({entries},{prepareAnchor:()=>({...prepareAnchor({commitments:[entries[0].commitment]}),proofs:[]})}),/contract_violation/);
  assert.throws(()=>prepareCounterpayInternalBatch({entries},{prepareAnchor:()=>({...prepareAnchor({commitments:entries.map(x=>x.commitment)}),proofs:[]})}),/contract_violation/);
});
test('missing anchor dependency fails closed',()=>{
  assert.throws(()=>prepareCounterpayInternalBatch({entries}),/trusted_anchor_preparer_required/);
});
