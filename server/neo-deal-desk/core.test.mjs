import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOpportunity, classifyProspect, evaluateApproval, quoteDeal, scoreProspect } from './core.mjs';

test('classifies investor inquiries into the gated equity lane', () => {
  assert.equal(classifyProspect({ intent:'seed investment' }), 'equity_investment');
});

test('scores a qualified decision-maker above a weak lead', () => {
  const strong=scoreProspect({ budgetUsd:750000, decisionAuthority:'CEO', timelineDays:45, needStrength:9, productFit:9, engagement:8 });
  const weak=scoreProspect({ budgetUsd:5000, decisionAuthority:'researcher', timelineDays:365, needStrength:3, productFit:3, engagement:2 });
  assert.ok(strong.score > weak.score);
  assert.ok(['A','B'].includes(strong.grade));
});

test('white-label foundation never opens below the canonical minimum', () => {
  const quote=quoteDeal({ dealClass:'white_label_foundation' });
  assert.equal(quote.ask, 250000);
});

test('whole-IP acquisition opens at 50M and exposes 25M internal discussion floor', () => {
  const quote=quoteDeal({ dealClass:'ip_acquisition' });
  assert.equal(quote.ask, 50000000);
  assert.deepEqual(quote.range, [25000000,50000000]);
});

test('equity investment requires approval before solicitation or terms', () => {
  const quote=quoteDeal({ dealClass:'equity_investment' });
  assert.equal(quote.approvalRequired, true);
  assert.ok(quote.approvalReasons.includes('securities_solicitation'));
});

test('discount, IP transfer and binding terms trigger the approval queue', () => {
  const approval=evaluateApproval({ discountBelowMinimum:true, transfersIp:true, binding:true });
  assert.equal(approval.approvalRequired,true);
  assert.deepEqual(new Set(approval.reasons), new Set(['discount_below_minimum','binding_commitment','ip_transfer']));
});

test('opportunity emits a CRM-compatible lead payload', () => {
  const opportunity=buildOpportunity({
    name:'Jane Doe',
    organization:'Example University',
    sector:'university',
    decisionAuthority:'CIO',
    budgetUsd:1000000,
    timelineDays:60,
    needStrength:8,
    productFit:9,
    engagement:7
  });
  assert.equal(opportunity.crmRecord.type,'lead');
  assert.equal(opportunity.crmRecord.status,'active');
  assert.equal(opportunity.dealClass,'institutional_saas');
  assert.equal(opportunity.stage,'draft_ready');
});
