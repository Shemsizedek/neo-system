import { createHash } from 'node:crypto';
import { isIP } from 'node:net';

export function normalizeName(value) {
  const name = String(value).toLowerCase().replace(/\.$/, '');
  if (name.length > 253 || !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+neo$/.test(name)) throw new Error('invalid_private_neo_name');
  return name;
}

export function canonicalRecords(input) {
  if (!Array.isArray(input)) throw new TypeError('records_array_required');
  const seen = new Set();
  return input.map(row => {
    const name = normalizeName(row.name);
    const address = String(row.address);
    if (seen.has(name)) throw new Error('duplicate_name');
    if (isIP(address) !== 4 || !address.startsWith('10.144.')) throw new Error('address_must_be_neo_vpn_ipv4');
    seen.add(name);
    return { name, address };
  }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

export function registryDigest(records) {
  const canonical = JSON.stringify({ version: 1, records: canonicalRecords(records) });
  return createHash('sha256').update(canonical).digest('hex');
}

export function anchorPayload(records) {
  return 'NEONAME1:' + registryDigest(records);
}

// Read-only verification: never creates, signs, or broadcasts a transaction.
// Requires Bitcoin Core RPC interface: getblockchaininfo and getrawtransaction.
export async function verifyBitcoinAnchor({ rpc, txid, records, minConfirmations = 6 }) {
  if (typeof rpc !== 'function') throw new TypeError('rpc_function_required');
  if (!/^[a-f0-9]{64}$/i.test(String(txid))) throw new Error('invalid_txid');
  if (!Number.isSafeInteger(minConfirmations) || minConfirmations < 1) throw new Error('invalid_min_confirmations');
  const info = await rpc('getblockchaininfo', []);
  if (info?.chain !== 'main') return { verified: false, reason: 'not_bitcoin_mainnet' };
  const tx = await rpc('getrawtransaction', [txid, true]);
  if (tx?.txid && tx.txid.toLowerCase() !== String(txid).toLowerCase()) return { verified: false, reason: 'txid_mismatch' };
  if ((tx?.confirmations ?? 0) < minConfirmations) return { verified: false, reason: 'insufficient_confirmations' };
  const expected = anchorPayload(records);
  for (const output of tx?.vout ?? []) {
    const asm = output?.scriptPubKey?.asm ?? '';
    const match = /^OP_RETURN ([a-f0-9]+)$/i.exec(asm);
    if (match && Buffer.from(match[1], 'hex').toString('utf8') === expected) {
      return { verified: true, confirmations: tx.confirmations, txid, digest: registryDigest(records) };
    }
  }
  return { verified: false, reason: 'digest_not_found_in_op_return' };
}
