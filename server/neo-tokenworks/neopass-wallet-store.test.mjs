import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createSqliteWalletProofStore } from './neopass-wallet-store.mjs';
import { createNeopassWalletProof } from './neopass-wallet-proof.mjs';

const binding = { subject: "member'; DROP TABLE x;--", sessionId: 'session', address: 'fixture-address', network: 'bitcoin-regtest' };
const origin = 'https://pass.example.org';
function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'neopass-'));
  const stores = [];
  t.after(() => { for (const store of stores) { try { store.close(); } catch {} } rmSync(directory, { recursive: true, force: true }); });
  return () => { const store = createSqliteWalletProofStore({ path: join(directory, 'proof.sqlite') }); stores.push(store); return store; };
}
const service = store => createNeopassWalletProof({ store, origin, now: () => 1000, verifySignature: async () => true });
const request = challenge => ({ id: challenge.id, subject: binding.subject, sessionId: binding.sessionId, signature: 'fixture' });

test('challenge survives restart and consumed proof stays consumed', async t => {
  const open = fixture(t), first = open();
  const challenge = service(first).issue(binding);
  first.close();
  const second = open();
  assert.equal((await service(second).verify(request(challenge))).subject, binding.subject);
  second.close();
  assert.equal(await service(open()).verify(request(challenge)), null);
});
test('two database connections cannot verify the same proof twice', async t => {
  const open = fixture(t), a = service(open()), b = service(open());
  const challenge = a.issue(binding);
  const results = await Promise.all([a.verify(request(challenge)), b.verify(request(challenge))]);
  assert.equal(results.filter(Boolean).length, 1);
});
test('wrong account, session and origin do not consume a valid challenge', async t => {
  const store = fixture(t)(), a = service(store), challenge = a.issue(binding);
  assert.equal(await a.verify({ ...request(challenge), subject: 'attacker' }), null);
  assert.equal(await a.verify({ ...request(challenge), sessionId: 'other' }), null);
  const other = createNeopassWalletProof({ store, origin: 'https://other.example.org', now: () => 1000, verifySignature: async () => true });
  assert.equal(await other.verify(request(challenge)), null);
  assert.ok(await a.verify(request(challenge)));
});
test('expired proof is rejected and cleanup deletes only expired rows', async t => {
  const store = fixture(t)(), a = service(store), challenge = a.issue(binding);
  assert.equal(store.pruneExpired(1000), 0);
  const expired = createNeopassWalletProof({ store, origin, now: () => challenge.expiresAt, verifySignature: async () => true });
  assert.equal(await expired.verify(request(challenge)), null);
  assert.equal(store.pruneExpired(challenge.expiresAt), 1);
});
test('closed database fails verification without granting wallet identity', async t => {
  const store = fixture(t)(), a = service(store), challenge = a.issue(binding);
  store.close();
  assert.equal(await a.verify(request(challenge)), null);
});
test('requires a persistent filename and an atomic store interface', () => {
  assert.throws(() => createSqliteWalletProofStore({ path: ':memory:' }));
  assert.throws(() => createNeopassWalletProof({ origin, store: {} }));
});
