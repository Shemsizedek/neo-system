import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateKeyPairSync, sign } from 'node:crypto';
import { parseAgentRegistry, loadAgentRegistry } from './registry.mjs';
import { createSourceInventory } from './sources.mjs';
import { createReceiptStore } from './receipt-store.mjs';
import { createNousRuntime } from './runtime.mjs';
import { createIdentityVerifier } from './identity.mjs';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicKeyPem = publicKey.export({ format: 'pem', type: 'spki' });
const now = 1780000000000;
const verifier = createIdentityVerifier({ publicKeyPem, issuer: 'test', audience: 'nous', now: () => now });
function bearer(scope = 'nous.task.plan nous.agents.read nous.sources.read') {
  const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'EdDSA' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({ sub: 'user', iss: 'test', aud: 'nous', exp: Math.floor(now / 1000) + 120, scope })).toString('base64url');
  const body = header + '.' + claims;
  return 'Bearer ' + body + '.' + sign(null, Buffer.from(body), privateKey).toString('base64url');
}

test('registry reads canonical NIA agents and rejects malformed or duplicate records', () => {
  const agents = loadAgentRegistry();
  assert.ok(agents.length >= 13);
  assert.equal(agents.find(agent => agent.id === 'NIA-008').name, 'Technology Intelligence Agent');
  assert.deepEqual(agents.find(agent => agent.id === 'NIA-003').capabilities, []);
  assert.throws(() => parseAgentRegistry('agents:\n'), /nous_registry_schema_invalid/);
  const sample = 'schema_version: "1.0"\nagents:\n  - id: "NIA-001"\n    name: "Test"\n    manifest: "agents/test/agent.yaml"\n    status: "active"\n    version: "1"\n';
  assert.throws(() => parseAgentRegistry(sample + sample.split('agents:\n')[1]), /nous_registry_entry_invalid/);
});

test('source inventory verifies bytes only and does not execute TypeScript', () => {
  const items = createSourceInventory().list();
  assert.equal(items.length, 3);
  assert.ok(items.every(item => item.status === 'source_verified' && item.execution === 'disabled' && /^[a-f0-9]{64}$/.test(item.sha256)));
  const runtime = createNousRuntime({ identityVerifier: verifier });
  assert.equal(runtime.listSources(bearer()).sources.length, 3);
  assert.throws(() => runtime.listSources(bearer('nous.task.plan')), /scope_denied/);
});

test('receipt store survives restart, detects changed reuse and rejects corrupted ledger', () => {
  const dir = mkdtempSync(join(tmpdir(), 'nous-os-state-'));
  try {
    const store = createReceiptStore(dir);
    const runtime = createNousRuntime({ identityVerifier: verifier, receiptStore: store, now: () => '2026-11-09T13:00:00Z' });
    const task = { requestId: 'REQ-22', agentId: 'NIA-008', capability: 'development.plan' };
    const first = runtime.plan(bearer(), task);
    assert.equal(first.execution, 'disabled');
    assert.deepEqual(runtime.plan(bearer(), task), first);
    assert.equal(store.stats().records, 1);
    assert.throws(() => runtime.plan(bearer(), { ...task, capability: 'project.plan' }), /nous_request_id_conflict/);
    store.close();
    const restored = createReceiptStore(dir);
    const restarted = createNousRuntime({ identityVerifier: verifier, receiptStore: restored });
    assert.deepEqual(restarted.plan(bearer(), task), first);
    restored.close();
    const file = join(dir, 'receipts.v1.jsonl');
    writeFileSync(file, readFileSync(file, 'utf8').replace('"planned"', '"executed"'));
    assert.throws(() => createReceiptStore(dir), /nous_receipt_log_corrupt/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('no configured persistent store is not represented as durable', () => {
  const runtime = createNousRuntime({ identityVerifier: verifier });
  assert.equal(runtime.stateStatus().durable, false);
  assert.equal(runtime.listAgents(bearer()).agents.find(a => a.id === 'NIA-013').status, 'routing_only');
});

test('real NEO Algo and social policy adapters classify locally without external actions', () => {
  const runtime = createNousRuntime({ identityVerifier: verifier });
  const adapters = runtime.listAdapters(bearer()).adapters;
  assert.equal(adapters.length, 3);
  assert.equal(runtime.classifyAdapter(bearer(), { adapterId: 'neo-algo-risk', value: 'financial_transfer' }).risk, 'red');
  assert.equal(runtime.classifyAdapter(bearer(), { adapterId: 'neo-algo-risk', value: 'publish' }).risk, 'yellow');
  const harmless = runtime.classifyAdapter(bearer(), { adapterId: 'neo-algo-risk', value: 'read' });
  assert.equal(harmless.risk, 'green');
  assert.equal(harmless.execution, 'disabled');
  assert.equal(runtime.classifyAdapter(bearer(), { adapterId: 'rudwaan-intent', value: 'publish_content' }).classification, 'privileged');
  assert.equal(runtime.classifyAdapter(bearer(), { adapterId: 'meta-muse-capability', value: 'canonical_doctrine' }).classification, 'nous');
  assert.throws(() => runtime.listAdapters(bearer('nous.task.plan')), /scope_denied/);
  assert.throws(() => runtime.classifyAdapter(bearer(), { adapterId: 'neo-algo-risk', value: 'x!bad' }), /invalid_adapter_input/);
  assert.throws(() => runtime.classifyAdapter(bearer(), { adapterId: 'unknown', value: 'read' }), /unknown_adapter/);
});
