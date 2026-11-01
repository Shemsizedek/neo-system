import { ECDH, KeyObject, randomBytes } from 'node:crypto'
import { createNeopassPsbtReviewer } from './neopass-psbt-review.mjs'
import { normalizePsbtIntent } from './psbt-authorization.mjs'
import { canonicalSignerRequest, signerRequestHash, verifySignerResponse } from './signer-protocol.mjs'
import { verifyFinalTransaction } from './final-transaction.mjs'
import { compileSignatureRefund } from '../../core/neo-nvm/signature-refund.mjs'
import { requireFields, VmInputError } from '../../core/neo-bvm/input.mjs'

const fail = code => { throw new VmInputError(code) }
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/

/** Complete authorization per call. Never accepts an old review receipt. */
export function createExternalSigningWorkflow({ reviewRpc, validationRpc, registry, jwtSecret, jwtIssuer, bindings, approvalStore,
  signer, adapter, now = () => Math.floor(Date.now() / 1000), timeoutMs = 10_000 } = {}) {
  requireFields(signer, ['signerId', 'publicKey', 'bitcoinPublicKeys', 'approverIds'])
  if (typeof signer.signerId !== 'string' || !ID.test(signer.signerId) || !(signer.publicKey instanceof KeyObject) ||
      signer.publicKey.type !== 'public' || signer.publicKey.asymmetricKeyType !== 'ed25519') fail('SIGNER_PINNED_PUBLIC_KEY_REQUIRED')
  if (!Array.isArray(signer.bitcoinPublicKeys) || signer.bitcoinPublicKeys.length < 1 || signer.bitcoinPublicKeys.length > 16 ||
      !Array.isArray(signer.approverIds) || signer.approverIds.length < 1 || signer.approverIds.length > 1_000 ||
      signer.approverIds.some(id => typeof id !== 'string' || !ID.test(id))) fail('SIGNER_PERMISSIONS_REQUIRED')
  const bitcoinKeys = new Set()
  for (const key of signer.bitcoinPublicKeys) {
    if (typeof key !== 'string' || !/^(02|03)[0-9a-f]{64}$/.test(key)) fail('SIGNER_BITCOIN_PUBLIC_KEY_INVALID')
    try { ECDH.convertKey(Buffer.from(key, 'hex'), 'secp256k1') } catch { fail('SIGNER_BITCOIN_PUBLIC_KEY_INVALID') }
    bitcoinKeys.add(key)
  }
  if (typeof adapter?.requestSignature !== 'function' || typeof validationRpc !== 'function' ||
      !Number.isSafeInteger(timeoutMs) || timeoutMs < 10 || timeoutMs > 30_000) fail('SIGNER_ADAPTER_CONFIGURATION_REQUIRED')
  const signerId = signer.signerId, publicKey = signer.publicKey, approvers = new Set(signer.approverIds)
  const requestSignature = adapter.requestSignature.bind(adapter)
  const reviewer = createNeopassPsbtReviewer({ rpc: reviewRpc, registry, jwtSecret, jwtIssuer, bindings, approvalStore, now })
  return Object.freeze({
    async signAndValidate(input) {
      requireFields(input, ['token', 'request'])
      requireFields(input.request, ['program', 'intent', 'psbtBase64', 'approval'])
      requireFields(input.request.approval, ['version', 'authorizerId', 'nonce', 'issuedAt', 'expiresAt', 'psbtHash', 'intentHash', 'signatureHex'])
      const token = input.token, program = Object.freeze({ ...input.request.program })
      const request = Object.freeze({ program, psbtBase64: input.request.psbtBase64,
        intent: normalizePsbtIntent(input.request.intent, program), approval: Object.freeze({ ...input.request.approval }) })
      const plan = compileSignatureRefund(program), branchKey = request.intent.branch === 'redeem' ? plan.redeemPublicKeyHex : plan.refundPublicKeyHex
      if (!bitcoinKeys.has(branchKey) || !approvers.has(request.approval.authorizerId)) fail('SIGNER_NOT_PERMITTED_FOR_REQUEST')
      const review = await reviewer.review({ token, request })
      const requireFresh = expiresAt => {
        const timestamp = now()
        if (!Number.isSafeInteger(timestamp) || timestamp < request.approval.issuedAt || timestamp >= expiresAt) fail('SIGNER_AUTHORIZATION_EXPIRED')
        return timestamp
      }
      const requireIdentity = async () => {
        const current = await reviewer.recheckIdentity({ token })
        if (current.neopassSubjectHash !== review.neopassSubjectHash || current.approvalKeyHash !== review.approvalKeyHash || current.approverId !== review.approverId) fail('SIGNER_IDENTITY_CHANGED')
      }
      await requireIdentity()
      const issuedAt = requireFresh(review.expiresAt), expiresAt = Math.min(review.expiresAt, issuedAt + 30)
      const outgoing = canonicalSignerRequest({ version: 1, network: 'regtest', signerId, requestId: randomBytes(32).toString('hex'), issuedAt, expiresAt,
        program, intent: request.intent, psbtBase64: request.psbtBase64, psbtHash: review.psbtHash, intentHash: review.intentHash,
        neopassSubjectHash: review.neopassSubjectHash, approvalKeyHash: review.approvalKeyHash, approval: request.approval })
      const controller = new AbortController()
      let timer, value
      try {
        value = await Promise.race([
          Promise.resolve().then(() => requestSignature({ request: outgoing, signal: controller.signal })),
          new Promise((_, reject) => { timer = setTimeout(() => { reject(new VmInputError('SIGNER_RESPONSE_TIMEOUT')); controller.abort() }, timeoutMs) }),
        ])
      } catch (error) { if (error instanceof VmInputError) throw error; fail('SIGNER_ADAPTER_FAILED') }
      finally { clearTimeout(timer) }
      requireFresh(expiresAt)
      const response = verifySignerResponse(value, outgoing, publicKey)
      await requireIdentity(); requireFresh(expiresAt)
      const final = await verifyFinalTransaction({ program, intent: request.intent, rawTransactionHex: response.rawTransactionHex,
        expectedFeeSats: review.feeSats, maximumSignedWeight: review.maximumSignedWeight }, { rpc: validationRpc })
      await requireIdentity(); requireFresh(expiresAt)
      return Object.freeze({ ...final, signerId, requestId: outgoing.requestId, requestHash: signerRequestHash(outgoing),
        psbtHash: review.psbtHash, intentHash: review.intentHash, neopassSubjectHash: review.neopassSubjectHash,
        approvalKeyHash: review.approvalKeyHash, nonceConsumed: true, userPresenceAttestedBySigner: true,
        signingLocation: 'external-adapter', applicationPrivateKeysLoaded: false, broadcast: false })
    },
  })
}
