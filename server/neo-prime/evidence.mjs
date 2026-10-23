import { createHash } from 'node:crypto'

const HASH = /^[a-f0-9]{64}$/
const NETWORKS = new Set(['mainnet', 'testnet', 'signet'])
export function normalizeOracleEvidence(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('evidence must be an object')
  const { source, network, txid, blockHash, confirmations, observedAt, asset, indexValue } = input
  if (!['neo-scan','crown-chain'].includes(source)) throw new TypeError('unrecognized evidence source')
  if (!NETWORKS.has(network)) throw new TypeError('unrecognized Bitcoin network')
  if (typeof txid !== 'string' || !HASH.test(txid)) throw new TypeError('invalid txid')
  if (typeof blockHash !== 'string' || !HASH.test(blockHash)) throw new TypeError('invalid block hash')
  if (!Number.isSafeInteger(confirmations) || confirmations < 0) throw new TypeError('invalid confirmations')
  if (typeof observedAt !== 'string' || !Number.isFinite(Date.parse(observedAt))) throw new TypeError('invalid observation time')
  if (Date.parse(observedAt) > Date.now() + 60000) throw new TypeError('future observation')
  if (typeof asset !== 'string' || !/^[A-Z0-9._-]{1,48}$/.test(asset)) throw new TypeError('invalid asset')
  if (indexValue !== undefined && (!Number.isFinite(indexValue) || indexValue < 0)) throw new TypeError('invalid index value')
  const record = { source, network, txid, blockHash, confirmations, observedAt, asset }
  if (indexValue !== undefined) record.indexValue = indexValue
  return Object.freeze(record)
}
export function oracleEvidenceReceipt(input) {
  const record = normalizeOracleEvidence(input)
  const canonical = JSON.stringify(record)
  return Object.freeze({
    schema: 'neo-oracle-evidence-v1',
    record,
    sha256: createHash('sha256').update(canonical).digest('hex'),
    verification: 'source-reported-unverified',
    settlementEnabled: false
  })
}
export function classifyOracleEvidence(receipt, { nodeVerified = false, maxAgeMs = 300000, now = Date.now() } = {}) {
  if (receipt?.schema !== 'neo-oracle-evidence-v1') throw new TypeError('invalid receipt')
  const { record, sha256 } = receipt
  const expected = oracleEvidenceReceipt(record).sha256
  if (sha256 !== expected) return Object.freeze({ status:'tampered', publishable:false })
  if (now - Date.parse(record.observedAt) > maxAgeMs) return Object.freeze({ status:'stale', publishable:false })
  if (!nodeVerified) return Object.freeze({ status:'unverified', publishable:false })
  if (record.confirmations < 1) return Object.freeze({ status:'unconfirmed', publishable:false })
  return Object.freeze({ status:'node-verified', publishable:true })
}
