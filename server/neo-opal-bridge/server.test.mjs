import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpalBridgeServer } from './server.mjs';

async function withServer(run) {
  const server = createOpalBridgeServer({ NEO_OPAL_BRIDGE_TOKEN: 'test-token' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); }
}

test('health reports production bridge', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'neo-opal-bridge');
  });
});

test('prepare rejects unauthenticated delivery', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/opal/prepare`, { method: 'POST' });
    assert.equal(res.status, 401);
  });
});

test('prepare emits neo-system delivery manifest', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/opal/prepare`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        'x-neo-approved': 'true',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Video Marketer',
        opalUrl: 'https://opal.google/app/example',
        targetHost: 'video.holytemples.org',
        files: [{ path: 'index.html', content: '<h1>NEO</h1>' }]
      })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.manifest.schema, 'neo.opal.delivery.v1');
    assert.equal(body.manifest.mode, 'artifact-delivery');
    assert.equal(body.manifest.delivery.appRoot, 'apps/opal/video-marketer');
    assert.equal(body.manifest.app.targetHost, 'video.holytemples.org');
  });
});

test('prepare blocks non-holytemples deployment targets', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/opal/prepare`, {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        'x-neo-approved': 'true',
        'content-type': 'application/json'
      },
      body: JSON.stringify({ name: 'Bad Target', targetHost: 'example.com' })
    });
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'TARGET_HOST_NOT_ALLOWED');
  });
});
