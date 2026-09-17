import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeoBootstrapReadOnlyProvider } from './read-only-provider.mjs';

test('provider exposes bounded read-only metadata', async () => {
  const provider = await createNeoBootstrapReadOnlyProvider({ rootDir: process.cwd() });
  const summary = provider.getSummary();
  assert.equal(provider.mode, 'read-only-context-provider');
  assert.equal(summary.systemId, 'neo-system');
  assert.equal(summary.architecture, 'additive');
  assert.equal(summary.authority, 'analytical-and-contextual-only');
  assert.equal(summary.humanReviewRequired, true);
  assert.equal(summary.autonomousOperationalAuthority, false);
});

test('router module context is descriptive only', async () => {
  const provider = await createNeoBootstrapReadOnlyProvider({ rootDir: process.cwd() });
  const router = provider.getModuleContext('neo-algo');
  assert.ok(router.routedDomains.includes('defense_intelligence'));
  assert.ok(router.routedDomains.includes('forecasting'));
  assert.equal(router.autonomousOperationalAuthority, false);
  assert.equal(provider.getModuleContext('not-a-module'), null);
});
