import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeEcosWorker,parseEcosPoolIntake,createEcosPrivateIntake,summarizeEcosIntake} from './ecosIntake.mjs';
// Fictional account in public source; the real account stays in the private packet.
const input = {accountId:'123456',workerName:'rig_S21_245_test',poolUrl:'stratum+tcp://pool.blc.am:3333/',requestedBudgetUsdCents:1000};

test('suffix and already-prefixed worker produce exactly one account prefix',()=>{
  const worker=normalizeEcosWorker(input.accountId,input.workerName);
  assert.equal(worker.full,'Ecos.123456.rig_S21_245_test');
  assert.deepEqual(normalizeEcosWorker(input.accountId,worker.full),worker);
});
for (const bad of ['Ecos.999999.rig','Ecos.123456.Ecos.123456.rig','rig/other','rig\npass','', 'a'.repeat(65)]) {
  test(`rejects invalid or cross-account worker ${JSON.stringify(bad)}`,()=>{
    assert.throws(()=>normalizeEcosWorker(input.accountId,bad),/ECOS_WORKER/);
  });
}
test('account identifiers are strict text, not coerced numbers or injected values',()=>{
  for(const id of [123456,'0','../file','1.2',' 123456',null]) assert.throws(()=>normalizeEcosWorker(id,'rig'),/ACCOUNT_ID/);
});
test('pool URL is normalized but never asserted verified or usable as payment address',()=>{
  const p=parseEcosPoolIntake(input.poolUrl);
  assert.equal(p.url,'stratum+tcp://pool.blc.am:3333');
  assert.equal(p.isBitcoinPaymentDestination,false);
  assert.equal(p.endpointOwnershipVerified,false);
  assert.equal(p.tls,false);
});
for(const bad of ['https://pool.blc.am:3333','stratum+tcp://user:pass@pool.blc.am:3333','stratum+tcp://pool.blc.am:3333/?token=secret','stratum+tcp://127.0.0.1:3333','stratum+tcp://pool.blc.am.evil.example:3333','stratum+tcp://pool.blc.am:3333/path']) {
  test(`rejects inappropriate endpoint ${bad.split('?')[0]}`,()=>{
    assert.throws(()=>parseEcosPoolIntake(bad),/ECOS_POOL/);
  });
}
test('public-pool hostname is only recognized input, not ownership or username verification',()=>{
  const p=parseEcosPoolIntake('stratum+tcp://pool.ecos.am:3333');
  assert.equal(p.endpointOwnershipVerified,false);
});
test('worker model/numbers never create fabricated hashrate or a funded contract',()=>{
  const p=createEcosPrivateIntake(input);
  assert.equal(p.observedHashrateTh,null);
  assert.equal(p.activeContractId,null);
  assert.equal(p.depositAddress,null);
  assert.equal(p.suppliedInstructionsType,'ASIC_POOL_CONNECTION');
  assert.equal(p.desiredProduct,'CLOUD_HASHPOWER');
});
test('budget is integer cents and never authorizes a transfer',()=>{
  for(const budget of [NaN,Infinity,-1,0,1.5,'1000',Number.MAX_SAFE_INTEGER+1]) {
    assert.throws(()=>createEcosPrivateIntake({...input,requestedBudgetUsdCents:budget}),/BUDGET/);
  }
  assert.equal(createEcosPrivateIntake(input).moneyMovementEnabled,false);
});
test('injected claims, credentials and fake balances cannot enable any capability',()=>{
  const p=createEcosPrivateIntake({...input,capacityEligible:true,checkoutEnabled:true,tokenIssuanceEnabled:true,
    externalEvidenceVerified:true,observedHashrateTh:245,activeContractId:'untrusted',balanceBtc:10,password:'do-not-copy'});
  for(const flag of ['capacityEligible','checkoutEnabled','tokenIssuanceEnabled','externalEvidenceVerified','moneyMovementEnabled','automaticReinvestmentEnabled','deviceRestartEnabled']) assert.equal(p[flag],false);
  assert.equal(JSON.stringify(p).includes('do-not-copy'),false);
});
test('shareable report redacts account/worker and ignores unrelated fields',()=>{
  const report=summarizeEcosIntake({...input,secret:'do-not-print'});
  const text=JSON.stringify(report);
  for(const secret of ['123456','rig_S21_245_test','do-not-print']) assert.equal(text.includes(secret),false);
  assert.equal(report.status,'BLOCKED_PENDING_PROVIDER_EVIDENCE');
  assert.equal(report.blockers.includes('ECOS_WRITTEN_RESALE_PERMISSION_REQUIRED'),true);
});
test('outputs are immutable and the module performs no network or command execution',()=>{
  const p=createEcosPrivateIntake(input);
  assert.throws(()=>{p.checkoutEnabled=true;},TypeError);
  assert.equal(Object.isFrozen(p.pool),true);
  const source=readFileSync(new URL('./ecosIntake.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(source,/\bfetch\s*\(|node:(net|http|https|child_process)|\bexec\s*\(/);
});
