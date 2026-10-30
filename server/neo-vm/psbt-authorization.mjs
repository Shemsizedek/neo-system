import { KeyObject, verify } from 'node:crypto'
import { compileSignatureRefund } from '../../core/neo-nvm/signature-refund.mjs'
import { decodeHex, requireFields, VmInputError } from '../../core/neo-bvm/input.mjs'
import { sha256Hex } from '../../core/neo-bvm/runtime.mjs'

const fail = code => { throw new VmInputError(code) }
const MAX_MONEY = 2_100_000_000_000_000n
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/
function hex32(value) {
  const b = decodeHex(value, 32)
  if (b.length !== 32) fail('PSBT_HASH_SIZE')
  return b.toString('hex')
}
function unsignedSats(value) {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]{0,15})$/.test(value) || BigInt(value) > MAX_MONEY) fail('PSBT_SATOSHIS_INVALID')
  return BigInt(value)
}
function btcSats(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 21_000_000 || Number(value.toFixed(8)) !== value) fail('PSBT_AMOUNT_INVALID')
  return BigInt(value.toFixed(8).replace('.', ''))
}
function empty(value) {
  return value === undefined || (value !== null && typeof value === 'object' && Reflect.ownKeys(value).filter(k => k !== 'length').length === 0)
}
function psbtBytes(value) {
  if (typeof value !== 'string' || value.length > 90_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) fail('PSBT_BASE64_INVALID')
  const bytes = Buffer.from(value, 'base64')
  if (bytes.length > 65_536 || bytes.toString('base64') !== value || bytes.subarray(0, 5).toString('hex') !== '70736274ff') fail('PSBT_FORMAT_INVALID')
  return bytes
}

export function normalizePsbtIntent(intent, program) {
  const plan = compileSignatureRefund(program)
  requireFields(intent, ['schemaVersion', 'network', 'programId', 'branch', 'outpoint', 'outputs', 'maxFeeSats', 'transactionVersion', 'lockTime', 'sequence'])
  if (intent.schemaVersion !== 1 || intent.network !== 'regtest' || !['redeem', 'refund'].includes(intent.branch)) fail('PSBT_INTENT_PROFILE_REQUIRED')
  if (hex32(intent.programId) !== plan.programId) fail('PSBT_INTENT_PROGRAM_MISMATCH')
  requireFields(intent.outpoint, ['txid', 'vout'])
  const txid = hex32(intent.outpoint.txid)
  if (!Number.isSafeInteger(intent.outpoint.vout) || intent.outpoint.vout < 0 || intent.outpoint.vout > 0xffffffff) fail('PSBT_OUTPOINT_INVALID')
  if (!Array.isArray(intent.outputs) || !intent.outputs.length || intent.outputs.length > 16) fail('PSBT_OUTPUTS_INVALID')
  const outputs = []
  for (const output of intent.outputs) {
    requireFields(output, ['scriptPubKeyHex', 'valueSats'])
    const script = decodeHex(output.scriptPubKeyHex, 34).toString('hex')
    if (!/^(0014[0-9a-f]{40}|0020[0-9a-f]{64})$/.test(script)) fail('PSBT_NATIVE_OUTPUT_REQUIRED')
    if (unsignedSats(output.valueSats) === 0n) fail('PSBT_OUTPUT_AMOUNT_REQUIRED')
    outputs.push(Object.freeze({ scriptPubKeyHex: script, valueSats: output.valueSats }))
  }
  const cap = unsignedSats(intent.maxFeeSats)
  if (cap < 1n || cap > 100_000n) fail('PSBT_FEE_CAP_INVALID')
  const lockTime = intent.branch === 'refund' ? plan.refundHeight : 0
  if (intent.transactionVersion !== 2 || intent.sequence !== 0xfffffffd || intent.lockTime !== lockTime) fail('PSBT_TRANSACTION_POLICY_INVALID')
  return Object.freeze({
    schemaVersion: 1, network: 'regtest', programId: plan.programId, branch: intent.branch,
    outpoint: Object.freeze({ txid, vout: intent.outpoint.vout }), outputs: Object.freeze(outputs),
    maxFeeSats: cap.toString(), transactionVersion: 2, lockTime, sequence: 0xfffffffd,
  })
}

export function psbtReviewCommitments(psbtBase64, intent, program) {
  const normalized = normalizePsbtIntent(intent, program)
  return Object.freeze({
    psbtHash: sha256Hex(psbtBytes(psbtBase64)),
    intentHash: sha256Hex(Buffer.from(`neo-nvm/psbt-intent-v1\0${JSON.stringify(normalized)}`)),
  })
}

// Operator-approval protocol only; not a claim of live NEOpass integration.
export function psbtApprovalChallenge(envelope) {
  requireFields(envelope, ['version', 'authorizerId', 'nonce', 'issuedAt', 'expiresAt', 'psbtHash', 'intentHash'])
  if (envelope.version !== 1 || typeof envelope.authorizerId !== 'string' || !ID.test(envelope.authorizerId)) fail('PSBT_APPROVER_INVALID')
  if (!Number.isSafeInteger(envelope.issuedAt) || envelope.issuedAt < 0 || !Number.isSafeInteger(envelope.expiresAt) ||
      envelope.expiresAt <= envelope.issuedAt || envelope.expiresAt - envelope.issuedAt > 300) fail('PSBT_APPROVAL_WINDOW_INVALID')
  const canonical = {
    version: 1, authorizerId: envelope.authorizerId, nonce: hex32(envelope.nonce),
    issuedAt: envelope.issuedAt, expiresAt: envelope.expiresAt,
    psbtHash: hex32(envelope.psbtHash), intentHash: hex32(envelope.intentHash),
  }
  return Buffer.from(`neo-nvm/psbt-approval-v1\0${JSON.stringify(canonical)}`)
}

/**
 * Read-only PSBT review with a configured public approval key and atomic nonce store.
 * It creates no Bitcoin signature and returns no signing/broadcast capability.
 */
export async function authorizePsbtReview(request, { rpc, approverId, approverPublicKey, consumeApproval, now = () => Math.floor(Date.now() / 1000) } = {}) {
  if (typeof rpc !== 'function') fail('PSBT_RPC_REQUIRED')
  if (typeof consumeApproval !== 'function') fail('PSBT_ATOMIC_APPROVAL_STORE_REQUIRED')
  if (typeof approverId !== 'string' || !ID.test(approverId) || !(approverPublicKey instanceof KeyObject) ||
      approverPublicKey.type !== 'public' || approverPublicKey.asymmetricKeyType !== 'ed25519') fail('PSBT_TRUSTED_APPROVER_REQUIRED')
  if (typeof now !== 'function') fail('PSBT_CLOCK_REQUIRED')
  requireFields(request, ['program', 'psbtBase64', 'intent', 'approval'])
  const program = request.program
  const psbtBase64 = request.psbtBase64
  const plan = compileSignatureRefund(program)
  const intent = normalizePsbtIntent(request.intent, program)
  const commitments = psbtReviewCommitments(psbtBase64, intent, program)
  requireFields(request.approval, ['version', 'authorizerId', 'nonce', 'issuedAt', 'expiresAt', 'psbtHash', 'intentHash', 'signatureHex'])
  // Capture authenticated fields before any await; caller mutation cannot extend
  // the signed lifetime, substitute a PSBT or change the consumed nonce.
  const approval = Object.freeze({ ...request.approval })
  const { signatureHex, ...unsignedApproval } = approval
  const challenge = psbtApprovalChallenge(unsignedApproval)
  const signature = decodeHex(signatureHex, 64)
  if (signature.length !== 64 || approval.authorizerId !== approverId ||
      hex32(approval.psbtHash) !== commitments.psbtHash || hex32(approval.intentHash) !== commitments.intentHash ||
      !verify(null, challenge, approverPublicKey, signature)) fail('PSBT_APPROVAL_SIGNATURE_INVALID')
  const requireFresh = () => {
    const timestamp = now()
    if (!Number.isSafeInteger(timestamp) || timestamp < approval.issuedAt || timestamp >= approval.expiresAt) fail('PSBT_APPROVAL_EXPIRED')
  }
  requireFresh()
  const chain = await rpc('getblockchaininfo', [])
  if (chain?.chain !== 'regtest') fail('PSBT_REGTEST_REQUIRED')
  if (!Number.isSafeInteger(chain.blocks) || chain.blocks < 0) fail('PSBT_CHAIN_CONTEXT_INVALID')
  if (intent.branch === 'refund' && chain.blocks < plan.refundHeight) fail('PSBT_REFUND_NOT_MATURE')
  const decoded = await rpc('decodepsbt', [psbtBase64])
  if (decoded?.psbt_version !== 0 || !empty(decoded.global_xpubs) || !empty(decoded.unknown) || !empty(decoded.proprietary)) fail('PSBT_VERSION_OR_METADATA_UNSUPPORTED')
  const tx = decoded.tx
  if (tx?.version !== 2 || tx.locktime !== intent.lockTime || !Array.isArray(tx.vin) || tx.vin.length !== 1 ||
      tx.vin[0]?.txid?.toLowerCase() !== intent.outpoint.txid || tx.vin[0].vout !== intent.outpoint.vout ||
      tx.vin[0].sequence !== intent.sequence || tx.vin[0].scriptSig?.hex !== '' || !empty(tx.vin[0].txinwitness)) fail('PSBT_TRANSACTION_INTENT_MISMATCH')
  if (!Array.isArray(tx.vout) || tx.vout.length !== intent.outputs.length || !Array.isArray(decoded.outputs) || decoded.outputs.length !== tx.vout.length) fail('PSBT_OUTPUT_INTENT_MISMATCH')
  for (let i = 0; i < tx.vout.length; i++) {
    const output = tx.vout[i]
    if (output.scriptPubKey?.hex?.toLowerCase() !== intent.outputs[i].scriptPubKeyHex || btcSats(output.value).toString() !== intent.outputs[i].valueSats) fail('PSBT_OUTPUT_INTENT_MISMATCH')
    if (Object.entries(decoded.outputs[i]).some(([key, value]) => !['unknown', 'proprietary'].includes(key) || !empty(value))) fail('PSBT_OUTPUT_METADATA_UNSUPPORTED')
  }
  if (!Array.isArray(decoded.inputs) || decoded.inputs.length !== 1) fail('PSBT_INPUT_METADATA_INVALID')
  const input = decoded.inputs[0]
  const inputFields = new Set(['witness_utxo', 'witness_script', 'sighash', 'non_witness_utxo', 'unknown', 'proprietary'])
  if (Object.keys(input).some(key => !inputFields.has(key)) || !empty(input.unknown) || !empty(input.proprietary) ||
      input.sighash !== 'ALL' || input.witness_script?.hex?.toLowerCase() !== plan.witnessScriptHex) fail('PSBT_UNSIGNED_SIGHASH_ALL_REQUIRED')
  const utxo = await rpc('gettxout', [intent.outpoint.txid, intent.outpoint.vout, true])
  if (!utxo || utxo.scriptPubKey?.hex?.toLowerCase() !== plan.scriptPubKeyHex ||
      input.witness_utxo?.scriptPubKey?.hex?.toLowerCase() !== plan.scriptPubKeyHex ||
      btcSats(input.witness_utxo.amount) !== btcSats(utxo.value)) fail('PSBT_UTXO_BINDING_MISMATCH')
  if (utxo.coinbase && (!Number.isSafeInteger(utxo.confirmations) || utxo.confirmations < 100)) fail('PSBT_IMMATURE_COINBASE')
  if (input.non_witness_utxo) {
    const previous = input.non_witness_utxo
    const previousOutput = previous.vout?.[intent.outpoint.vout]
    if (previous.txid?.toLowerCase() !== intent.outpoint.txid || previousOutput?.scriptPubKey?.hex?.toLowerCase() !== plan.scriptPubKeyHex ||
        btcSats(previousOutput.value) !== btcSats(utxo.value)) fail('PSBT_PREVIOUS_TRANSACTION_MISMATCH')
  }
  const fee = btcSats(utxo.value) - intent.outputs.reduce((total, o) => total + unsignedSats(o.valueSats), 0n)
  if (fee < 1n || fee > unsignedSats(intent.maxFeeSats)) fail('PSBT_FEE_OUT_OF_BOUNDS')
  const scriptBytes = plan.witnessScriptHex.length / 2
  // Signature <= 73 bytes, preimage 32, minimal branch selector, script < 253.
  const witnessBytes = intent.branch === 'redeem' ? 1 + 74 + 33 + 2 + 1 + scriptBytes : 1 + 74 + 1 + 1 + scriptBytes
  if (!Number.isSafeInteger(tx.weight) || tx.weight < 1 || tx.weight + 2 + witnessBytes > 400_000) fail('PSBT_WEIGHT_OUT_OF_BOUNDS')
  requireFresh()
  const nonceKey = `neo-nvm/psbt-approval-v1:${approverId}:${hex32(approval.nonce)}`
  if (await consumeApproval(nonceKey, approval.expiresAt) !== true) fail('PSBT_APPROVAL_REPLAYED')
  requireFresh()
  return Object.freeze({
    network: 'regtest', authorization: 'REVIEW_APPROVED', approverId, ...commitments,
    programId: plan.programId, branch: intent.branch, feeSats: Number(fee),
    maximumSignedWeight: tx.weight + 2 + witnessBytes, expiresAt: approval.expiresAt,
    nonceConsumed: true, bitcoinSignatureCreated: false, broadcast: false,
  })
}
