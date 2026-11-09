import { mkdirSync, existsSync, readFileSync, openSync, writeSync, fsyncSync, closeSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const keyOf = (subject, requestId) => JSON.stringify([subject, requestId]);
const hashOf = ({ previousHash, receipt }) =>
  createHash('sha256').update(JSON.stringify({ previousHash, receipt })).digest('hex');

/**
 * A single-writer append-only, hash-chained staging receipt log.
 * No payloads, secrets, commands, or tokens are saved.
 * It is tamper-evident only, not tamper-proof. Do not use multi-replica.
 */
export function createReceiptStore(directory) {
  if (typeof directory !== 'string' || !directory.trim()) throw new Error('nous_state_directory_required');
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = join(directory, 'receipts.v1.jsonl');
  const byKey = new Map();
  let previousHash = 'GENESIS';
  if (existsSync(file)) {
    const data = readFileSync(file, 'utf8');
    if (data.length && !data.endsWith('\n')) throw new Error('nous_receipt_log_truncated');
    for (const line of data.split('\n').filter(Boolean)) {
      let entry;
      try { entry = JSON.parse(line); } catch { throw new Error('nous_receipt_log_corrupt'); }
      if (!entry || entry.previousHash !== previousHash || entry.hash !== hashOf(entry) ||
          !entry.receipt || typeof entry.receipt.subject !== 'string' || typeof entry.receipt.requestId !== 'string' ||
          typeof entry.receipt.agentId !== 'string' || typeof entry.receipt.capability !== 'string') {
        throw new Error('nous_receipt_log_corrupt');
      }
      const key = keyOf(entry.receipt.subject, entry.receipt.requestId);
      if (byKey.has(key)) throw new Error('nous_receipt_log_duplicate');
      byKey.set(key, Object.freeze(entry.receipt));
      previousHash = entry.hash;
    }
  }
  const fd = openSync(file, 'a', 0o600);
  chmodSync(file, 0o600);
  return {
    get(subject, requestId) { return byKey.get(keyOf(subject, requestId)) || null; },
    append(receipt) {
      const key = keyOf(receipt.subject, receipt.requestId);
      if (byKey.has(key)) throw new Error('nous_request_id_conflict');
      const entry = { previousHash, receipt };
      entry.hash = hashOf(entry);
      const data = Buffer.from(JSON.stringify(entry) + '\n');
      if (writeSync(fd, data) !== data.length) throw new Error('nous_receipt_short_write');
      fsyncSync(fd);
      byKey.set(key, Object.freeze(receipt));
      previousHash = entry.hash;
      return receipt;
    },
    close() { closeSync(fd); },
    stats() { return { records: byKey.size, auditChain: 'sha256', durable: true, multiWriter: false }; },
  };
}
