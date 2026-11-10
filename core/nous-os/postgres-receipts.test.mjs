import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { createPostgresReceiptStore } from './postgres-receipts.mjs';
import { createIdentityVerifier } from './identity.mjs';
import { createNousRuntime } from './runtime.mjs';
import { createNousServer } from './server.mjs';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const now = 1780000000000;
const verifier = createIdentityVerifier({ publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }), issuer: 'test', audience: 'nous', now: () => now });
function bearer(scope = 'nous.task.plan') {
  const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'EdDSA' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'test-person', iss: 'test', aud: 'nous', exp: Math.floor(now / 1000) + 120, scope })).toString('base64url');
  const message = header + '.' + payload;
  return 'Bearer ' + message + '.' + sign(null, Buffer.from(message), privateKey).toString('base64url');
}
function database() {
  const data = new Map();
  let online = true;
  const pool = {
    setOnline(value) { online = value; },
    async query(sql, args) {
      if (!online) throw new Error('db_unavailable');
      if (sql === 'SELECT 1 AS healthy') return { rows: [{ healthy: 1 }] };
      if (sql.startsWith('INSERT INTO public.nous_receipts')) {
        const key = JSON.stringify(args.slice(0, 2));
        if (data.has(key)) return { rows: [] };
        const receipt = JSON.parse(args[4]);
        data.set(key, receipt);
        return { rows: [{ receipt }] };
      }
      if (sql.startsWith('SELECT receipt FROM public.nous_receipts')) {
        const receipt = data.get(JSON.stringify(args));
        return { rows: receipt ? [{ receipt }] : [] };
      }
      throw new Error('unexpected_query');
    },
    async end() {},
  };
  return pool;
}

test('Postgres adapter enforces configured connection, atomic duplicate replay and scoped read behavior', async () => {
  assert.rejects(createPostgresReceiptStore({}), /nous_database_url_required/);
  const fake = database();
  const store = await createPostgresReceiptStore({
    connectionString: 'postgresql://placeholder:placeholder@example.invalid/nous_os',
    poolFactory: () => fake,
  });
  assert.equal(await store.ping(), true);
  const runtime = createNousRuntime({ identityVerifier: verifier, postgresReceiptStore: store, now: () => '2026-11-09T12:00:00Z' });
  assert.equal(runtime.stateStatus().backend, 'postgresql');
  const task = { requestId: 'REQ-X', agentId: 'NIA-008', capability: 'development.plan' };
  const a = await runtime.planHosted(bearer(), task);
  const b = await runtime.planHosted(bearer(), task);
  assert.deepEqual(a, b);
  assert.equal(a.execution, 'disabled');
  await assert.rejects(runtime.planHosted(bearer(), { ...task, capability: 'project.plan' }), /nous_request_id_conflict/);
  await assert.rejects(runtime.planHosted(bearer('nous.agents.read'), task), /scope_denied/);
  fake.setOnline(false);
  assert.equal(await runtime.stateReady(), false);
  await assert.rejects(runtime.planHosted(bearer(), { ...task, requestId: 'REQ-Y' }), /nous_receipt_persistence_failed/);
  await store.close();
});

test('Hosted HTTP status remains 503 when database is inaccessible; planning never silently falls back to volatile state', async () => {
  const fake = database();
  const store = await createPostgresReceiptStore({ connectionString: 'postgresql://placeholder:placeholder@example.invalid/nous_os', poolFactory: () => fake });
  const runtime = createNousRuntime({ identityVerifier: verifier, postgresReceiptStore: store });
  const server = createNousServer({ runtime });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    assert.equal((await fetch(base + '/ready')).status, 200);
    fake.setOnline(false);
    assert.equal((await fetch(base + '/ready')).status, 503);
    const result = await fetch(base + '/v1/tasks/plan', { method: 'POST', headers: { authorization: bearer(), 'content-type': 'application/json' }, body: JSON.stringify({ requestId: 'REQ-Z', agentId: 'NIA-008', capability: 'project.plan' }) });
    assert.equal(result.status, 503);
    assert.equal((await result.json()).error, 'nous_receipt_persistence_failed');
  } finally {
    await new Promise(resolve => server.close(resolve));
    await store.close();
  }
});
