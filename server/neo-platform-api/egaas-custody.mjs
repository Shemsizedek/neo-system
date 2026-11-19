import { randomBytes } from 'node:crypto';
import { createStorageObject, decryptObject, sha256 } from '../neo-storage/fabric.mjs';
import storagePolicy from '../../architecture/neo-storage-fabric-policy.json' with { type: 'json' };
import { prepareEgaasAnchor } from './egaas-anchors.mjs';

const HASH = /^[a-f0-9]{64}$/;
const SCHEMA = 'neo-gisd-synthetic-receipt-v1';
const DOMAIN = 'NEO-EGAAS-PRIVATE-RECEIPT-V1\n';
export function canonicalSyntheticGisdReceipt(record) {
  const keys = ['schema', 'synthetic', 'receiptId', 'learnerId', 'courseId', 'completedAt'];
  if (!record || Object.getPrototypeOf(record) !== Object.prototype ||
      Object.keys(record).length !== keys.length || Object.keys(record).some(key => !keys.includes(key)) ||
      record.schema !== SCHEMA || record.synthetic !== true ||
      ['receiptId', 'learnerId', 'courseId'].some(key => typeof record[key] !== 'string' || !/^SYNTHETIC-[A-Z0-9-]{1,64}$/.test(record[key])) ||
      typeof record.completedAt !== 'string' || !Number.isFinite(Date.parse(record.completedAt)) ||
      new Date(record.completedAt).toISOString() !== record.completedAt) throw new Error('synthetic_receipt_required');
  // Fixed ordered, string/boolean-only schema; no generic JSON canonicalization.
  return JSON.stringify(Object.fromEntries(keys.map(key => [key, record[key]])));
}
const commitmentFor = (canonical, nonce) => sha256(Buffer.concat([Buffer.from(DOMAIN), Buffer.from(nonce, 'hex'), Buffer.from(canonical)]));

/** Internal synthetic-only adapter. Storage and runtime key are trusted dependencies. */
export function createSyntheticGisdCustody({ storage, key } = {}) {
  if (!storage?.put || !storage?.get || !Buffer.isBuffer(key) || key.length !== 32) throw new Error('private_storage_and_runtime_key_required');
  return {
    save(record) {
      const canonical = canonicalSyntheticGisdReceipt(record);
      const nonce = randomBytes(32).toString('hex');
      const commitment = commitmentFor(canonical, nonce);
      const bytes = Buffer.from(JSON.stringify({ schema: 'neo-egaas-custody-v1', record: JSON.parse(canonical), nonce, commitment }));
      const object = createStorageObject({ bytes, key, storageClass: 'EVIDENCE', mediaType: 'application/json', policy: storagePolicy });
      storage.put(object);
      return { custodyRef: object.content_digest, commitment, synthetic: true };
    },
    restore(custodyRef) {
      if (typeof custodyRef !== 'string' || !HASH.test(custodyRef)) throw new Error('invalid_custody_reference');
      try {
        const object = storage.get(custodyRef);
        const bytes = decryptObject({ ciphertext: object.ciphertext, ...object.encryption }, key);
        if (sha256(bytes) !== custodyRef || object.content_digest !== custodyRef) throw new Error();
        const envelope = JSON.parse(bytes.toString('utf8'));
        if (envelope.schema !== 'neo-egaas-custody-v1' || !HASH.test(envelope.nonce) || !HASH.test(envelope.commitment) ||
            commitmentFor(canonicalSyntheticGisdReceipt(envelope.record), envelope.nonce) !== envelope.commitment) throw new Error();
        return { record: envelope.record, commitment: envelope.commitment };
      } catch { throw new Error('custody_restore_or_integrity_failed'); }
    },
    prepare(custodyRefs) {
      if (!Array.isArray(custodyRefs) || custodyRefs.length < 1 || custodyRefs.length > 128) throw new Error('invalid_custody_batch');
      return prepareEgaasAnchor({ commitments: custodyRefs.map(ref => this.restore(ref).commitment) });
    },
  };
}
