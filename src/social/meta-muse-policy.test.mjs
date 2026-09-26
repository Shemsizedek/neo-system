import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyMetaMuseCapability,
  canTreatMetaResultAsCanonical,
} from './meta-muse-policy.mjs';

test('commodity agentic work prefers Meta', () => {
  assert.equal(classifyMetaMuseCapability('multimodal_generation'), 'meta');
  assert.equal(classifyMetaMuseCapability('background_agent_tasks'), 'meta');
});

test('governance and doctrine stay in Nous', () => {
  assert.equal(classifyMetaMuseCapability('canonical_doctrine'), 'nous');
  assert.equal(classifyMetaMuseCapability('approval_gates'), 'nous');
});

test('unmapped capability requires review', () => {
  assert.equal(classifyMetaMuseCapability('unknown_future_meta_feature'), 'review');
});

test('native Meta output is not canonical without Nous receipt', () => {
  assert.equal(canTreatMetaResultAsCanonical({}), false);
  assert.equal(canTreatMetaResultAsCanonical({nousReceipt:'receipt-123'}), true);
});
