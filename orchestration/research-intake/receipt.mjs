import { createHash, verify } from 'node:crypto';
export function verifyReceipt(receipt, signature, trustedKey, expected) {
  if (!receipt || !expected || !trustedKey || !Buffer.isBuffer(signature)) return false;
  const fields = ['task_id','payload_hash','owner_id','result_hash'];
  if (!fields.every(k => typeof receipt[k] === 'string' && receipt[k].length > 0 && receipt[k].length <= 512)) return false;
  if (!/^[a-f0-9]{64}$/.test(receipt.payload_hash) || !/^[a-f0-9]{64}$/.test(receipt.result_hash)) return false;
  if (!['task_id','payload_hash','owner_id'].every(k => receipt[k] === expected[k])) return false;
  const bytes = Buffer.from(JSON.stringify(['NEO-RELAY-RECEIPT-v1', ...fields.map(k => receipt[k])]));
  try {
    if (trustedKey.type !== 'public' || trustedKey.asymmetricKeyType !== 'ec' || trustedKey.asymmetricKeyDetails?.namedCurve !== 'prime256v1') return false;
    return verify('sha256', bytes, trustedKey, signature) ? createHash('sha256').update(bytes).digest('hex') : false;
  } catch { return false; }
}
