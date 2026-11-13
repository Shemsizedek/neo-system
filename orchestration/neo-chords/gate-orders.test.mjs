import test from 'node:test';
import assert from 'node:assert/strict';
import {parseOrder,proposeGateOrder} from './gate-orders.mjs';
const principal = {verified:true,subjectId:'neo-operator',scopes:['chords.gate.propose']};
const gate = {id:'gate-1',revision:5,next:{id:'gate-2',approvalClass:'A'}};
const order = (utterance, overrides={}) => proposeGateOrder({utterance,principal,gate,expectedRevision:5,...overrides});
test('next gate works by voice and with a preceding spoken closing sentence',()=>{
  assert.equal(parseOrder('Next gate').verb,'NEXT_GATE');
  assert.equal(parseOrder('I will talk instead of typing. Next gate.').verb,'NEXT_GATE');
  assert.equal(order('Next gate.').nextGateId,'gate-2');
  assert.equal(order('Next gate').executes,false);
});
test('questions mentioning next gate do not silently advance',()=>{
  assert.equal(parseOrder('What does next gate mean?'),null);
  assert.equal(parseOrder('Please explain next gate'),null);
});
test('recognizes all seven canonical Noocratic motion verbs without changing their authority',()=>{
  for(const verb of ['Motion','Postpone','Amend','Commit','Question','Table','Adjourn']){
    assert.equal(order(`${verb}: review the source`).verb,verb.toUpperCase());
    assert.equal(order(`${verb}: review the source`).authority,'proposal_only');
  }
});
test('only a verified scoped operator may propose an order',()=>{
  assert.throws(()=>order('Next gate',{principal:{verified:false,subjectId:'neo-operator',scopes:['chords.gate.propose']}}),/verified_operator/);
  assert.throws(()=>order('Next gate',{principal:{verified:true,subjectId:'neo-operator',scopes:[]}}),/verified_operator/);
  assert.throws(()=>order('Next gate',{source:'webpage'}),/untrusted_order_source/);
});
test('stale revision and missing next gate fail closed',()=>{
  assert.throws(()=>order('Next gate',{expectedRevision:4}),/stale_gate_revision/);
  assert.equal(order('Next gate',{gate:{id:'gate-1',revision:5}}).status,'BLOCKED');
});
test('same voice order + gate revision yields same proposal id without executing twice',()=>{
  assert.equal(order('Next gate').orderId,order('Next gate').orderId);
  assert.equal(order('Next gate',{gate:{...gate,revision:6},expectedRevision:6}).orderId===order('Next gate').orderId,false);
});
test('non-Class-A next gate signals escalation and does not execute',()=>{
  const next = order('Next gate',{gate:{...gate,next:{id:'funds',approvalClass:'D'}}});
  assert.equal(next.escalationRequired,true);
  assert.equal(next.executes,false);
});
test('adjourn is a proposal and closed gates reject advancement',()=>{
  assert.equal(order('Adjourn: close meeting').verb,'ADJOURN');
  assert.equal(order('Next gate',{gate:{...gate,closed:true}}).status,'BLOCKED');
});
