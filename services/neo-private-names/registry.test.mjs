import assert from 'node:assert/strict';
import test from 'node:test';
import { anchorPayload, canonicalRecords, registryDigest, verifyBitcoinAnchor } from './registry.mjs';
import { buildResponse } from './dns.mjs';

const records = [{ name: 'wallet.neo', address: '10.144.20.11' }, { name: 'core.neo', address: '10.144.20.10' }];
function query(name, type = 1) {
  const labels = name.split('.').map(s => Buffer.concat([Buffer.from([s.length]), Buffer.from(s)]));
  return Buffer.concat([Buffer.from([0x12, 0x34, 0x01, 0, 0, 1, 0, 0, 0, 0, 0, 0]), ...labels, Buffer.from([0, 0, type, 0, 1])]);
}
test('canonical records and stable digest', () => {
  assert.equal(canonicalRecords(records)[0].name, 'core.neo');
  assert.equal(registryDigest(records), registryDigest([...records].reverse()));
  assert.match(anchorPayload(records), /^NEONAME1:[a-f0-9]{64}$/);
});
test('rejects duplicate and external records', () => {
  assert.throws(() => canonicalRecords([...records, records[0]]), /duplicate_name/);
  assert.throws(() => canonicalRecords([{ name: 'core.neo', address: '8.8.8.8' }]), /neo_vpn/);
});
test('DNS resolves only known internal A records', () => {
  const good = buildResponse(query('core.neo'), records);
  assert.equal(good.readUInt16BE(6), 1);
  assert.deepEqual([...good.subarray(-4)], [10, 144, 20, 10]);
  assert.equal(buildResponse(query('unknown.neo'), records).readUInt16BE(2) & 15, 3);
  assert.equal(buildResponse(query('public.org'), records).readUInt16BE(2) & 15, 5);
  assert.equal(buildResponse(query('core.neo', 28), records).readUInt16BE(6), 0);
});
test('Bitcoin mainnet OP_RETURN proof verified only after confirmations', async () => {
  const txid = 'a'.repeat(64);
  const payloadHex = Buffer.from(anchorPayload(records)).toString('hex');
  const rpc = async method => method === 'getblockchaininfo' ? { chain: 'main' } : { confirmations: 8, vout: [{ scriptPubKey: { asm: 'OP_RETURN ' + payloadHex } }] };
  assert.equal((await verifyBitcoinAnchor({ rpc, txid, records })).verified, true);
  assert.equal((await verifyBitcoinAnchor({ rpc: async method => method === 'getblockchaininfo' ? { chain: 'test' } : {}, txid, records })).verified, false);
  assert.equal((await verifyBitcoinAnchor({ rpc: async method => method === 'getblockchaininfo' ? { chain: 'main' } : { confirmations: 2 }, txid, records })).verified, false);
});
