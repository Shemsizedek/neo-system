import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createNeoPlatformApi, PLATFORM_REGISTRY } from './server.mjs';

async function withServer(fn) {
  const server = createNeoPlatformApi({ now: () => '2026-08-25T00:00:00.000Z' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  try { await fn(`http://127.0.0.1:${port}`); }
  finally { server.close(); await once(server, 'close'); }
}

test('publishes health and seven-platform registry', async () => {
  await withServer(async base => {
    const health = await fetch(`${base}/health`).then(r => r.json());
    assert.equal(health.status, 'ok');
    assert.equal(health.platforms, 7);

    const registry = await fetch(`${base}/api/v1/platforms`).then(r => r.json());
    assert.equal(registry.platforms.length, Object.keys(PLATFORM_REGISTRY).length);
    assert.ok(registry.platforms.some(p => p.id === 'neopay'));
    assert.ok(registry.platforms.some(p => p.id === 'neo-miner'));
  });
});

test('publishes platform capability and health endpoints', async () => {
  await withServer(async base => {
    const capabilitiesRes = await fetch(`${base}/api/v1/platforms/neo-prime/capabilities`);
    assert.equal(capabilitiesRes.status, 200);
    const capabilities = await capabilitiesRes.json();
    assert.equal(capabilities.platform, 'neo-prime');
    assert.equal(capabilities.readOnly, true);
    assert.ok(capabilities.services.includes('markets'));

    const platformHealth = await fetch(`${base}/api/v1/platforms/neo-teller/health`).then(r => r.json());
    assert.equal(platformHealth.status, 'ok');
  });
});

test('rejects unknown platforms and write methods', async () => {
  await withServer(async base => {
    const missing = await fetch(`${base}/api/v1/platforms/not-real`);
    assert.equal(missing.status, 404);

    const write = await fetch(`${base}/api/v1/platforms`, { method: 'POST' });
    assert.equal(write.status, 405);
    const body = await write.json();
    assert.equal(body.readOnly, true);
  });
});
