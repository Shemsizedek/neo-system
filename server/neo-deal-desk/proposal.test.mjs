import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOpportunity } from './core.mjs';
import { buildApprovalQueueItem, buildProposal, nextFollowUp } from './proposal.mjs';

test('commercial opportunity generates a non-binding proposal', () => {
  const opportunity=buildOpportunity({
    organization:'Example Family Office',
    sector:'organization',
    intent:'custom operating system',
    decisionAuthority:'Managing Partner',
    budgetUsd:1500000,
    timelineDays:60,
    productFit:9,
    needStrength:9,
    engagement:8,
    complexity:7
  });
  const proposal=buildProposal(opportunity,{modules:['NEOsync','NEO Router'],outcomes:['Private operating environment']});
  assert.equal(proposal.kind,'non_binding_proposal');
  assert.match(proposal.disclaimer,/Non-binding/);
  assert.equal(proposal.modules.length,2);
});

test('investor opportunity creates an approval queue item', () => {
  const opportunity=buildOpportunity({
    organization:'Example Capital',
    intent:'seed investment',
    decisionAuthority:'Partner',
    budgetUsd:3000000,
    productFit:8,
    needStrength:7,
    engagement:7
  });
  const queue=buildApprovalQueueItem(opportunity,{subject:'Investor introduction'});
  assert.equal(queue.status,'pending');
  assert.equal(queue.silenceIsApproval,false);
  assert.ok(queue.reasons.includes('securities_solicitation'));
});

test('follow-up cadence accelerates for negotiation', () => {
  const result=nextFollowUp({stage:'negotiating',lastContactAt:'2026-09-23T12:00:00.000Z'});
  assert.equal(result.cadenceDays,2);
});
