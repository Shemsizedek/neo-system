import assert from 'node:assert/strict';
import test from 'node:test';
import {dispatchSocialJob, normalizeProviderResult, resolveProviderOrder} from './neo-social-dispatcher.mjs';

test('connected organic provider is first for Facebook and LinkedIn', () => {
  assert.deepEqual(resolveProviderOrder('facebook'), ['windsor_organic', 'direct_platform_api']);
  assert.deepEqual(resolveProviderOrder('linkedin'), ['windsor_organic', 'direct_platform_api']);
});

test('provider success without post id is submitted, not published', () => {
  const receipt = normalizeProviderResult({
    provider: 'windsor_organic', destination: 'facebook', accountId: '123',
    contentId: 'campaign:1', sourceVersion: '1', result: {success: true},
  });
  assert.equal(receipt.status, 'submitted');
  assert.equal(receipt.platformPostId, null);
  assert.equal(receipt.verification, 'pending-readback');
});

test('provider post id produces published receipt', () => {
  const receipt = normalizeProviderResult({
    provider: 'windsor_organic', destination: 'linkedin', accountId: '456',
    contentId: 'campaign:1', sourceVersion: '1', result: {id: 'urn:li:share:1'},
  });
  assert.equal(receipt.status, 'published');
  assert.equal(receipt.platformPostId, 'urn:li:share:1');
});

test('dispatcher falls back when connected provider is unavailable', async () => {
  const calls = [];
  const receipt = await dispatchSocialJob({
    destination: 'facebook', accountId: '123', contentId: 'campaign:1', sourceVersion: '1'
  }, {
    isAvailable: async (provider) => provider !== 'windsor_organic',
    execute: async (provider) => { calls.push(provider); return {accountId: '123', id: 'fb-post-1'}; },
  });
  assert.deepEqual(calls, ['direct_platform_api']);
  assert.equal(receipt.provider, 'direct_platform_api');
  assert.equal(receipt.status, 'published');
});

test('dispatcher falls back after provider execution error', async () => {
  const calls = [];
  const receipt = await dispatchSocialJob({
    destination: 'linkedin', accountId: '456', contentId: 'campaign:1', sourceVersion: '1'
  }, {
    execute: async (provider) => {
      calls.push(provider);
      if (provider === 'windsor_organic') throw new Error('provider unavailable');
      return {accountId: '456', id: 'li-post-1'};
    },
  });
  assert.deepEqual(calls, ['windsor_organic', 'direct_platform_api']);
  assert.equal(receipt.status, 'published');
  assert.equal(receipt.attempts[0].status, 'error');
});
