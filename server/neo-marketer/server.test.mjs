import test from 'node:test';
import assert from 'node:assert/strict';
import { createMarketerServer } from './server.mjs';

async function withServer(run) {
  const server = createMarketerServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); }
}

test('health endpoint is production ready', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, 'neo-marketer');
  });
});

test('status exposes marketer modules', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/api/marketer/status`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.mode, 'production');
    assert.ok(body.modules.includes('video-marketer'));
  });
});

test('root serves NEO Marketer UI', async () => {
  await withServer(async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    const body = await res.text();
    assert.match(body, /NEO Marketer/i);
    assert.match(body, /Campaign Command Center/i);
  });
});
