import { normalizeOracleEvidence } from './evidence.mjs'

const EXPECTED_CHAIN = Object.freeze({mainnet:'main',testnet:'test',signet:'signet'})
const HASH = /^[a-f0-9]{64}$/
/**
 * Read-only independent Bitcoin Core RPC evidence check.
 * rpc(method, params) MUST be a trusted operator-configured Bitcoin Core client.
 * Never accept an RPC URL or credentials from a public request.
 */
export async function verifyBitcoinRpcEvidence(input, { rpc, minimumConfirmations = 1 } = {}) {
  const record = normalizeOracleEvidence(input)
  if (typeof rpc !== 'function') throw new TypeError('trusted Bitcoin Core RPC required')
  if (!Number.isSafeInteger(minimumConfirmations) || minimumConfirmations < 1) throw new TypeError('minimumConfirmations must be positive')
  const chain = await rpc('getblockchaininfo', [])
  if (chain?.chain !== EXPECTED_CHAIN[record.network]) return Object.freeze({ verified:false, reason:'wrong_network' })
  const tx = await rpc('getrawtransaction', [record.txid, true])
  if (tx?.txid !== record.txid || typeof tx.blockhash !== 'string' || !HASH.test(tx.blockhash) || tx.blockhash !== record.blockHash) {
    return Object.freeze({ verified:false, reason:'transaction_block_mismatch' })
  }
  const header = await rpc('getblockheader', [record.blockHash, true])
  if (!header || header.hash !== record.blockHash || !Number.isSafeInteger(header.confirmations) || header.confirmations < minimumConfirmations) {
    return Object.freeze({ verified:false, reason:'not_confirmed_on_active_chain' })
  }
  if (!Number.isSafeInteger(tx.confirmations) || tx.confirmations < minimumConfirmations) {
    return Object.freeze({ verified:false, reason:'transaction_unconfirmed' })
  }
  if (tx.confirmations !== header.confirmations || record.confirmations !== tx.confirmations) {
    return Object.freeze({ verified:false, reason:'confirmation_count_mismatch' })
  }
  return Object.freeze({ verified:true, network:record.network, txid:record.txid, blockHash:record.blockHash, confirmations:tx.confirmations, evidenceType:'bitcoin-node-confirmation', note:'This confirms Bitcoin inclusion only; it does not verify asset valuations or token economics.' })
}
