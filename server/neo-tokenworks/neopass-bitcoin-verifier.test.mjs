import test from 'node:test';
import assert from 'node:assert/strict';
import { createECDH, createHash } from 'node:crypto';
import bitcoinMessage from 'bitcoinjs-message';
import bs58check from 'bs58check';
import { verifyBitcoinOwnership } from './neopass-bitcoin-verifier.mjs';
import { createNeopassWalletProof } from './neopass-wallet-proof.mjs';

// Public, disposable test key only; never use for funds.
const key = Buffer.alloc(32); key[31] = 1;
const ecdh = createECDH('secp256k1'); ecdh.setPrivateKey(key);
const hash = createHash('ripemd160').update(createHash('sha256').update(ecdh.getPublicKey(null, 'compressed')).digest()).digest();
const address = version => bs58check.encode(Buffer.concat([Buffer.from([version]), hash]));
const sign = message => bitcoinMessage.sign(message, key, true).toString('base64');

test('verifies fixed upstream Bitcoin Signed Message example', () => {
  assert.equal(verifyBitcoinOwnership({ network: 'bitcoin-mainnet', address: '1F3sAm6ZtwLAUnj7d38pGFxtP3RVEvtsbV', message: 'This is an example of a signed message.', signature: 'H9L5yLFjti0QTHhPyFrZCT1V/MMnBtXKmoiKDZ78NDBjERki6ZTQZdSMCtkgoNmp17By9ItJr8o7ChX0XxY91nk=' }), true);
});
test('validates real signatures and rejects modified message/address/network', () => {
  const message = 'NEOpass ownership test', signature = sign(message);
  const proof = { address: address(0), network: 'bitcoin-mainnet', message, signature };
  assert.equal(verifyBitcoinOwnership(proof), true);
  assert.equal(verifyBitcoinOwnership({ ...proof, message: message + ' altered' }), false);
  assert.equal(verifyBitcoinOwnership({ ...proof, network: 'bitcoin-testnet' }), false);
  assert.equal(verifyBitcoinOwnership({ ...proof, address: '1F3sAm6ZtwLAUnj7d38pGFxtP3RVEvtsbV' }), false);
  const bytes = Buffer.from(signature, 'base64'); bytes[10] ^= 1;
  assert.equal(verifyBitcoinOwnership({ ...proof, signature: bytes.toString('base64') }), false);
});
test('supports testnet and regtest address versions, rejects unsupported formats', () => {
  const message = 'test', signature = sign(message);
  for (const network of ['bitcoin-testnet', 'bitcoin-regtest']) assert.equal(verifyBitcoinOwnership({ address: address(111), network, message, signature }), true);
  for (const invalid of [{ network: 'ethereum' }, { address: address(5) }, { address: 'bc1punsupported' }, { signature: 'invalid' }]) {
    assert.equal(verifyBitcoinOwnership({ address: address(0), network: 'bitcoin-mainnet', message, signature, ...invalid }), false);
  }
});
test('real signature completes NEOpass challenge once and binds the entire server message', async () => {
  const service = createNeopassWalletProof({ origin: 'https://pass.example.org', verifySignature: verifyBitcoinOwnership });
  const challenge = service.issue({ subject: 'member', sessionId: 'session', address: address(111), network: 'bitcoin-regtest' });
  const request = { id: challenge.id, subject: 'member', sessionId: 'session', signature: sign(challenge.message) };
  assert.equal((await service.verify(request)).address, address(111));
  assert.equal(await service.verify(request), null);
});
