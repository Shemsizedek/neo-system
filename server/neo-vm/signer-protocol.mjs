import { KeyObject, verify } from 'node:crypto'
import { compileSignatureRefund } from '../../core/neo-nvm/signature-refund.mjs'
import { decodeHex, requireFields, VmInputError } from '../../core/neo-bvm/input.mjs'
import { sha256Hex } from '../../core/neo-bvm/runtime.mjs'
import { normalizePsbtIntent, psbtReviewCommitments, psbtApprovalChallenge } from './psbt-authorization.mjs'
import { finalTransactionBytes } from './final-transaction.mjs'

const fail = code => { throw new VmInputError(code) }
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/
const HASH = /^[0-9a-f]{64}$/
export function canonicalSignerRequest(value) {
  requireFields(value, ['version', 'network', 'requestId', 'signerId', 'issuedAt', 'expiresAt', 'program', 'intent', 'psbtBase64', 'psbtHash', 'intentHash', 'neopassSubjectHash', 'approvalKeyHash', 'approval'])
  if (value.version !== 1 || value.network !== 'regtest' || typeof value.signerId !== 'string' || !ID.test(value.signerId) ||
      ![value.requestId, value.psbtHash, value.intentHash, value.neopassSubjectHash, value.approvalKeyHash].every(x => typeof x === 'string' && HASH.test(x)) ||
      !Number.isSafeInteger(value.issuedAt) || value.issuedAt < 0 || !Number.isSafeInteger(value.expiresAt) ||
      value.expiresAt <= value.issuedAt || value.expiresAt - value.issuedAt > 30) fail('SIGNER_REQUEST_INVALID')
  const plan = compileSignatureRefund(value.program)
  const program = Object.freeze({ schemaVersion: 1, family: 'bitcoin', network: 'regtest', kind: plan.kind,
    digestHex: plan.digestHex, redeemPublicKeyHex: plan.redeemPublicKeyHex, refundPublicKeyHex: plan.refundPublicKeyHex, refundHeight: plan.refundHeight })
  const intent = normalizePsbtIntent(value.intent, program)
  const commitments = psbtReviewCommitments(value.psbtBase64, intent, program)
  if (commitments.psbtHash !== value.psbtHash || commitments.intentHash !== value.intentHash) fail('SIGNER_REQUEST_COMMITMENT_MISMATCH')
  requireFields(value.approval, ['version', 'authorizerId', 'nonce', 'issuedAt', 'expiresAt', 'psbtHash', 'intentHash', 'signatureHex'])
  const copied = { ...value.approval }, { signatureHex, ...unsigned } = copied
  psbtApprovalChallenge(unsigned)
  const signature = decodeHex(signatureHex, 64)
  const approval = Object.freeze({ version: 1, authorizerId: copied.authorizerId, nonce: copied.nonce.toLowerCase(),
    issuedAt: copied.issuedAt, expiresAt: copied.expiresAt, psbtHash: copied.psbtHash.toLowerCase(), intentHash: copied.intentHash.toLowerCase(), signatureHex: signature.toString('hex') })
  if (signature.length !== 64 ||
      approval.psbtHash !== commitments.psbtHash || approval.intentHash !== commitments.intentHash ||
      value.issuedAt < approval.issuedAt || value.expiresAt > approval.expiresAt) fail('SIGNER_OPERATOR_APPROVAL_INVALID')
  return Object.freeze({ version: 1, network: 'regtest', requestId: value.requestId, signerId: value.signerId,
    issuedAt: value.issuedAt, expiresAt: value.expiresAt, program, intent, psbtBase64: value.psbtBase64, ...commitments,
    neopassSubjectHash: value.neopassSubjectHash, approvalKeyHash: value.approvalKeyHash, approval })
}
export const signerRequestHash = request => sha256Hex(Buffer.from(`neo-nvm/signer-request-v1\0${JSON.stringify(canonicalSignerRequest(request))}`))

// Device-side public-key check. The device must also pin the operator ID and
// subject binding, enforce time and user presence, and consume its own durable
// approval nonce before signing. A transport credential alone is insufficient.
export function verifySignerOperatorApproval(value, publicKey) {
  const request = canonicalSignerRequest(value), { signatureHex, ...unsigned } = request.approval
  if (!(publicKey instanceof KeyObject) || publicKey.type !== 'public' || publicKey.asymmetricKeyType !== 'ed25519' ||
      sha256Hex(publicKey.export({ type: 'spki', format: 'der' })) !== request.approvalKeyHash ||
      !verify(null, psbtApprovalChallenge(unsigned), publicKey, Buffer.from(signatureHex, 'hex'))) fail('SIGNER_OPERATOR_APPROVAL_INVALID')
  return request
}

export function signerResponseChallenge(response) {
  requireFields(response, ['version', 'network', 'requestId', 'signerId', 'requestHash', 'expiresAt', 'userPresenceAttested', 'rawTransactionHex'])
  if (response.version !== 1 || response.network !== 'regtest' || typeof response.signerId !== 'string' || !ID.test(response.signerId) ||
      ![response.requestId, response.requestHash].every(x => typeof x === 'string' && HASH.test(x)) ||
      !Number.isSafeInteger(response.expiresAt) || response.expiresAt < 0 || response.userPresenceAttested !== true) fail('SIGNER_RESPONSE_INVALID')
  const fields = { version: 1, network: 'regtest', requestId: response.requestId, signerId: response.signerId,
    requestHash: response.requestHash, expiresAt: response.expiresAt, userPresenceAttested: true,
    rawTransactionHash: sha256Hex(finalTransactionBytes(response.rawTransactionHex)) }
  return Buffer.from(`neo-nvm/signer-response-v1\0${JSON.stringify(fields)}`)
}

export function verifySignerResponse(value, request, publicKey) {
  requireFields(value, ['version', 'network', 'requestId', 'signerId', 'requestHash', 'expiresAt', 'userPresenceAttested', 'rawTransactionHex', 'signatureHex'])
  const response = Object.freeze({ ...value }), { signatureHex, ...unsigned } = response
  if (!(publicKey instanceof KeyObject) || publicKey.type !== 'public' || publicKey.asymmetricKeyType !== 'ed25519') fail('SIGNER_PINNED_PUBLIC_KEY_REQUIRED')
  const challenge = signerResponseChallenge(unsigned), signature = decodeHex(signatureHex, 64)
  if (signature.length !== 64 || response.requestId !== request.requestId || response.signerId !== request.signerId ||
      response.expiresAt !== request.expiresAt || response.requestHash !== signerRequestHash(request) ||
      !verify(null, challenge, publicKey, signature)) fail('SIGNER_RESPONSE_SIGNATURE_OR_BINDING_INVALID')
  return response
}
