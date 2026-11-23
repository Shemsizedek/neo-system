import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeopassWalletProof } from './neopass-wallet-proof.mjs';

const binding = { subject: 'member', sessionId: 'session', address: 'fixture-address', network: 'bitcoin-regtest' };
function setup(verifier = async () => true) {
  let clock = 1000;
  const service = createNeopassWalletProof({ origin: 'https://pass.example.org', now: () => clock, verifySignature: verifier });
  const challenge = service.issue(binding);
  return { service, challenge, request: { id: challenge.id, subject: binding.subject, sessionId: binding.sessionId, signature: 'fixture' }, advance: () => { clock += 300001; } };
}
test('binds exact server message and network to trusted verification; consumes once', async () => {
  let received;
  const x = setup(async input => { received = input; return true; });
  assert.equal((await x.service.verify(x.request)).purpose, 'wallet-link');
  assert.equal(received.message, x.challenge.message);
  assert.equal(received.network, 'bitcoin-regtest');
  assert.match(received.message, /no payment or asset transfer/);
  assert.equal(await x.service.verify(x.request), null);
});
test('rejects wrong account/session and expired challenges', async () => {
  const x = setup();
  assert.equal(await x.service.verify({ ...x.request, subject: 'attacker' }), null);
  assert.equal(await x.service.verify({ ...x.request, sessionId: 'other' }), null);
  x.advance();
  assert.equal(await x.service.verify(x.request), null);
});
test('rejects absent, failed, throwing, or non-boolean signature verification', async () => {
  for (const verifier of [null, async () => false, async () => { throw Error('offline'); }, async () => ({ verified: true })]) {
    const x = setup(verifier);
    assert.equal(await x.service.verify(x.request), null);
  }
});
test('concurrent replay permits one verification only', async () => {
  const x = setup();
  const results = await Promise.all([x.service.verify(x.request), x.service.verify(x.request)]);
  assert.equal(results.filter(Boolean).length, 1);
});
test('expiry during verification fails closed', async () => {
  let x;
  x = setup(async () => { x.advance(); return true; });
  assert.equal(await x.service.verify(x.request), null);
});
test('rejects unsafe origin, message injection, and unsupported network', () => {
  assert.throws(() => createNeopassWalletProof({ origin: 'http://pass.example.org' }));
  const x = setup();
  assert.throws(() => x.service.issue({ ...binding, address: 'address\nPurpose: send' }));
  assert.throws(() => x.service.issue({ ...binding, network: 'ethereum' }));
});
