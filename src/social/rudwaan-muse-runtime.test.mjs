import assert from 'node:assert/strict';
import test from 'node:test';
import {
  routeMuseTask,
  buildMuseHandoff,
  acceptMuseResult,
} from './rudwaan-muse-runtime.mjs';

test('compute-heavy tasks route to Muse', () => {
  assert.equal(routeMuseTask('research'), 'meta');
  assert.equal(routeMuseTask('multimodal_generation'), 'meta');
  assert.equal(routeMuseTask('instagram_analysis'), 'meta');
});

test('authority tasks stay in Nous', () => {
  assert.equal(routeMuseTask('canonical_doctrine'), 'nous');
  assert.equal(routeMuseTask('approval'), 'nous');
  assert.equal(routeMuseTask('privileged_action'), 'nous');
});

test('Muse handoff is non-canonical until Nous receipt exists', () => {
  const h = buildMuseHandoff({
    taskClass: 'research',
    prompt: 'Analyze Instagram engagement patterns',
  });
  assert.equal(h.provider, 'meta-muse');
  assert.equal(h.canonical, false);
  assert.equal(h.receiptRequiredForCanonicalUse, true);
});

test('Muse result becomes canonical only with Nous receipt', () => {
  assert.equal(acceptMuseResult({result:{ok:true}}).canonical, false);
  assert.equal(acceptMuseResult({result:{ok:true},nousReceipt:'neo-123'}).canonical, true);
});
