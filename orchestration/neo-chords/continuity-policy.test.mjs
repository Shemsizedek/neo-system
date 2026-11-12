import test from 'node:test';
import assert from 'node:assert/strict';
import { assessChordsContinuity } from './continuity-policy.mjs';
const input = {
 computeNodes:[
  {id:'render-a',provider:'render',failureDomain:'render-us-east',health:'HEALTHY',verified:true,attested:true},
  {id:'host-b',provider:'neo-owned',failureDomain:'owned-west',health:'HEALTHY',verified:true,attested:true}
 ],
 namingRoutes:[
  {id:'dns-a',controller:'provider-1',rootDomain:'holytemples.org',reachable:true,verified:true},
  {id:'dns-b',controller:'provider-2',rootDomain:'neo.example',reachable:true,verified:true}
 ],
 storageCopies:[
  {id:'db-a',provider:'neon',failureDomain:'region-1',verified:true,restoreTested:true,encrypted:true},
  {id:'backup-b',provider:'neo-owned',failureDomain:'region-2',verified:true,restoreTested:true,encrypted:true}
 ]
};
test('does not claim decentralized operation without verified independent routes',()=>{
  const result=assessChordsContinuity();
  assert.equal(result.state,'BLOCKED');
  assert.equal(result.blockers.length,3);
});
test('healthy hosts within one provider do not qualify as independent hosting',()=>{
  const changed={...input,computeNodes:[input.computeNodes[0],{...input.computeNodes[1],provider:'render'}]};
  assert.equal(assessChordsContinuity(changed).planes.compute.status,'BLOCKED');
});
test('two unverified endpoints do not create false evidence of resilience',()=>{
  const changed={...input,namingRoutes:input.namingRoutes.map(x=>({...x,verified:false}))};
  assert.equal(assessChordsContinuity(changed).planes.naming.verifiedCandidates,0);
});
test('storage replicas require independent providers, encrypted restore-tested copies',()=>{
  const changed={...input,storageCopies:input.storageCopies.map((x,i)=>i?{...x,restoreTested:false}:x)};
  assert.equal(assessChordsContinuity(changed).planes.storage.status,'BLOCKED');
});
test('independent verified candidates qualify only for review, not cutover',()=>{
  const state=assessChordsContinuity(input);
  assert.equal(state.state,'READY_FOR_INDEPENDENT_REVIEW');
  assert.equal(state.automaticDnsCutoverAllowed,false);
  assert.equal(state.automaticDatabasePromotionAllowed,false);
  assert.equal(state.changesApplied,false);
});
