import { createHash } from 'node:crypto'
import { compileSignatureRefund } from '../../core/neo-nvm/signature-refund.mjs'
import { normalizePsbtIntent } from './psbt-authorization.mjs'
import { decodeHex, requireFields, VmInputError } from '../../core/neo-bvm/input.mjs'
import { sha256Hex } from '../../core/neo-bvm/runtime.mjs'
import { restrictedBvmBitcoinRpc } from './shared-bitcoin-core.mjs'

const fail = code => { throw new VmInputError(code) }
const HASH = /^[0-9a-f]{64}$/
const sha = bytes => createHash('sha256').update(bytes).digest()
const txHash = bytes => sha(sha(bytes)).reverse().toString('hex')
export function finalTransactionBytes(hex) {
  const bytes = decodeHex(hex, 65_536)
  if (!bytes.length) fail('SIGNER_FINAL_TRANSACTION_REQUIRED')
  return bytes
}

/** Strict wire parser for this one-input native SegWit profile, not a consensus VM. */
export function inspectFinalTransaction({ program, intent, rawTransactionHex }) {
  const plan = compileSignatureRefund(program), normalized = normalizePsbtIntent(intent, program)
  const bytes = finalTransactionBytes(rawTransactionHex)
  let offset = 0
  const take = length => {
    if (offset + length > bytes.length) fail('SIGNER_TRANSACTION_TRUNCATED')
    const result = bytes.subarray(offset, offset + length); offset += length; return result
  }
  // All supported counts and vectors are below 253. Larger or noncanonical
  // CompactSize encodings are unsupported, even if another profile permits them.
  const small = () => { const n = take(1)[0]; if (n >= 253) fail('SIGNER_TRANSACTION_ENCODING_UNSUPPORTED'); return n }
  if (take(4).readInt32LE() !== 2 || take(2).toString('hex') !== '0001' || small() !== 1) fail('SIGNER_TRANSACTION_PROFILE_INVALID')
  const txid = Buffer.from(take(32)).reverse().toString('hex'), vout = take(4).readUInt32LE()
  if (txid !== normalized.outpoint.txid || vout !== normalized.outpoint.vout || small() !== 0 || take(4).readUInt32LE() !== normalized.sequence) fail('SIGNER_FINAL_INPUT_MISMATCH')
  if (small() !== normalized.outputs.length) fail('SIGNER_FINAL_OUTPUT_MISMATCH')
  for (const output of normalized.outputs) {
    const amount = take(8).readBigUInt64LE(), script = take(small()).toString('hex')
    if (amount !== BigInt(output.valueSats) || script !== output.scriptPubKeyHex) fail('SIGNER_FINAL_OUTPUT_MISMATCH')
  }
  const witnessOffset = offset
  const count = small(), expected = normalized.branch === 'redeem' ? 4 : 3
  if (count !== expected) fail('SIGNER_FINAL_WITNESS_MISMATCH')
  const witness = Array.from({ length: count }, () => take(small()))
  if (witness.at(-1).toString('hex') !== plan.witnessScriptHex || witness[0].length < 9 || witness[0].length > 73 || witness[0].at(-1) !== 1) fail('SIGNER_FINAL_WITNESS_MISMATCH')
  if (normalized.branch === 'redeem') {
    if (witness[1].length !== 32 || sha256Hex(witness[1]) !== plan.digestHex || witness[2].toString('hex') !== '01') fail('SIGNER_FINAL_WITNESS_MISMATCH')
  } else if (witness[1].length !== 0) fail('SIGNER_FINAL_WITNESS_MISMATCH')
  const locktimeBytes = take(4)
  if (locktimeBytes.readUInt32LE() !== normalized.lockTime || offset !== bytes.length) fail('SIGNER_FINAL_LOCKTIME_OR_TRAILING_DATA')
  const stripped = Buffer.concat([bytes.subarray(0, 4), bytes.subarray(6, witnessOffset), locktimeBytes])
  const weight = stripped.length * 3 + bytes.length
  if (weight > 400_000) fail('SIGNER_FINAL_WEIGHT_INVALID')
  return Object.freeze({ txid: txHash(stripped), wtxid: txHash(bytes), weight, vsize: Math.ceil(weight / 4), size: bytes.length,
    rawTransactionHash: sha256Hex(bytes), normalizedIntent: normalized })
}

function sats(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 21_000_000 || Number(value.toFixed(8)) !== value) fail('SIGNER_CORE_AMOUNT_INVALID')
  return BigInt(value.toFixed(8).replace('.', ''))
}

/** Fresh Core validation of actual returned bytes. This never broadcasts. */
export async function verifyFinalTransaction(request, { rpc } = {}) {
  requireFields(request, ['program', 'intent', 'rawTransactionHex', 'expectedFeeSats', 'maximumSignedWeight'])
  const program = Object.freeze({ ...request.program }), rawTransactionHex = request.rawTransactionHex
  const parsed = inspectFinalTransaction({ program, intent: request.intent, rawTransactionHex }), intent = parsed.normalizedIntent
  const plan = compileSignatureRefund(program)
  const expectedFee = request.expectedFeeSats, maximumWeight = request.maximumSignedWeight
  if (!Number.isSafeInteger(expectedFee) || expectedFee < 1 || expectedFee > 100_000 ||
      !Number.isSafeInteger(maximumWeight) || maximumWeight < parsed.weight || maximumWeight > 400_000) fail('SIGNER_FINAL_REVIEW_CONTEXT_INVALID')
  const core = restrictedBvmBitcoinRpc(rpc)
  const chain = await core('getblockchaininfo', [])
  if (chain?.chain !== 'regtest') fail('SIGNER_FINAL_REGTEST_REQUIRED')
  if (!Number.isSafeInteger(chain.blocks) || chain.blocks < 0 || !HASH.test(chain.bestblockhash || '')) fail('SIGNER_CORE_CHAIN_CONTEXT_INVALID')
  const blockHash = chain.bestblockhash, blockHeight = chain.blocks
  if (intent.branch === 'refund' && blockHeight < plan.refundHeight) fail('SIGNER_FINAL_REFUND_NOT_MATURE')
  const outputSats = intent.outputs.reduce((sum, o) => sum + BigInt(o.valueSats), 0n)
  const requireUtxo = utxo => {
    if (!utxo || utxo.bestblock !== blockHash || utxo.scriptPubKey?.hex !== plan.scriptPubKeyHex ||
        (utxo.coinbase && (!Number.isSafeInteger(utxo.confirmations) || utxo.confirmations < 100))) fail('SIGNER_FINAL_UTXO_CHANGED')
    const fee = sats(utxo.value) - outputSats
    if (fee !== BigInt(expectedFee) || fee < 1n || fee > BigInt(intent.maxFeeSats)) fail('SIGNER_FINAL_FEE_CHANGED')
  }
  requireUtxo(await core('gettxout', [intent.outpoint.txid, intent.outpoint.vout, true]))
  const decoded = await core('decoderawtransaction', [rawTransactionHex])
  if (decoded?.txid !== parsed.txid || decoded.hash !== parsed.wtxid || decoded.weight !== parsed.weight || decoded.vsize !== parsed.vsize || decoded.size !== parsed.size) fail('SIGNER_CORE_DECODE_MISMATCH')
  const policy = await core('testmempoolaccept', [[rawTransactionHex], 0.1])
  if (!Array.isArray(policy) || policy.length !== 1 || policy[0]?.txid !== parsed.txid || policy[0]?.wtxid !== parsed.wtxid || typeof policy[0]?.allowed !== 'boolean') fail('SIGNER_CORE_MEMPOOL_RESPONSE_INVALID')
  if (!policy[0].allowed) fail('SIGNER_FINAL_CORE_REJECTED')
  if (policy[0].vsize !== parsed.vsize || sats(policy[0].fees?.base) !== BigInt(expectedFee)) fail('SIGNER_CORE_FEE_OR_SIZE_MISMATCH')
  const end = await core('getblockchaininfo', [])
  if (end?.chain !== 'regtest' || end.bestblockhash !== blockHash || end.blocks !== blockHeight) fail('SIGNER_CHAIN_CHANGED_DURING_VALIDATION')
  requireUtxo(await core('gettxout', [intent.outpoint.txid, intent.outpoint.vout, true]))
  return Object.freeze({ network: 'regtest', validation: 'FINAL_TRANSACTION_VALIDATED',
    txid: parsed.txid, wtxid: parsed.wtxid, rawTransactionHash: parsed.rawTransactionHash,
    weight: parsed.weight, vsize: parsed.vsize, feeSats: expectedFee, checkedAtBlockHash: blockHash,
    checkedAtBlockHeight: blockHeight, mempoolAccepted: true, broadcast: false })
}
