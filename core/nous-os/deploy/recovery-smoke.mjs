import assert from 'node:assert/strict';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, chmodSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const image = process.env.NOUS_SMOKE_IMAGE || 'neo-nous-os:ci';
const name = 'neo-nous-recovery-' + randomUUID().slice(0, 8);
const port = 18089;
const endpoint = 'http://127.0.0.1:' + port;
const stateDir = mkdtempSync(join(tmpdir(), 'nous-recovery-'));
chmodSync(stateDir, 0o777); // Ephemeral runner-only fixture; no secrets are persisted.
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicKeyBase64 = Buffer.from(publicKey.export({ type: 'spki', format: 'pem' })).toString('base64');
const exec = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function token() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'EdDSA' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    sub: 'nous-smoke:operator',
    iss: 'neo-pass-nous-exchange',
    aud: 'neo-nous',
    token_use: 'nous-read',
    iat: now, nbf: now, exp: now + 120,
    scope: 'nous.agents.read nous.task.plan nous.adapters.read',
  })).toString('base64url');
  const message = header + '.' + body;
  return message + '.' + sign(null, Buffer.from(message), privateKey).toString('base64url');
}
async function waitForHealth() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(endpoint + '/health', { signal: AbortSignal.timeout(1200) });
      if (res.status === 200) return;
    } catch {}
    await sleep(250);
  }
  throw new Error('container_health_timeout');
}
function run() {
  exec('run', '-d', '--rm', '--name', name,
    '-p', '127.0.0.1:' + port + ':8080',
    '--mount', 'type=bind,source=' + stateDir + ',target=/app/state',
    '-e', 'NOUS_STATE_DIR=/app/state',
    '-e', 'NOUS_IDENTITY_ISSUER=neo-pass-nous-exchange',
    '-e', 'NOUS_IDENTITY_AUDIENCE=neo-nous',
    '-e', 'NOUS_IDENTITY_PUBLIC_KEY_PEM_BASE64=' + publicKeyBase64,
    image);
}
async function stop() {
  try { exec('rm', '-f', name); } catch {}
  // Docker --rm removal is asynchronous; wait for the named container
  // to disappear before attempting a restart on the same port.
  for (let i = 0; i < 40; i++) {
    try { exec('inspect', name); }
    catch { return; }
    await sleep(150);
  }
  throw new Error('container_cleanup_timeout');
}
async function request(path, { method = 'GET', bearer, body } = {}) {
  const res = await fetch(endpoint + path, {
    method,
    headers: {
      ...(bearer ? { authorization: 'Bearer ' + bearer } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(5000),
  });
  return { status: res.status, data: await res.json() };
}

try {
  const bearer = token();
  const task = { requestId: 'NOUS-STAGING-RECOVERY-1', agentId: 'NIA-008', capability: 'development.plan' };
  run();
  await waitForHealth();
  assert.equal((await request('/ready')).status, 200);
  assert.equal((await request('/v1/agents')).status, 401);
  assert.equal((await request('/v1/agents', { bearer })).status, 200);
  const first = await request('/v1/tasks/plan', { method: 'POST', bearer, body: task });
  assert.equal(first.status, 200);
  assert.equal(first.data.execution, 'disabled');
  assert.equal(first.data.status, 'planned');
  await stop();
  run();
  await waitForHealth();
  const second = await request('/v1/tasks/plan', { method: 'POST', bearer, body: task });
  assert.equal(second.status, 200);
  assert.deepEqual(second.data, first.data);
  const conflict = await request('/v1/tasks/plan', { method: 'POST', bearer, body: { ...task, capability: 'project.plan' } });
  assert.equal(conflict.status, 409);
  const ready = await request('/ready');
  assert.equal(ready.data.state.durable, true);
  assert.equal(ready.data.state.records, 1);
  console.log('Nous OS isolated container recovery: auth, replay and conflict protection PASS');
} finally {
  await stop();
  rmSync(stateDir, { recursive: true, force: true });
}
