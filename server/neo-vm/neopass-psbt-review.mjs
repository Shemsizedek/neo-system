import { KeyObject } from 'node:crypto'
import { verifyNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'
import { authorizePsbtReview, normalizePsbtIntent, psbtReviewCommitments } from './psbt-authorization.mjs'
import { isSqliteApprovalStore } from './approval-store.mjs'
import { requireFields, VmInputError } from '../../core/neo-bvm/input.mjs'
import { sha256Hex } from '../../core/neo-bvm/runtime.mjs'

const fail = code => { throw new VmInputError(code) }
const SUBJECT = /^google:[A-Za-z0-9_-]{1,128}$/
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/
const hash = text => sha256Hex(Buffer.from(text))

/**
 * Existing NEOpass session verification + active authoritative membership +
 * separately provisioned Ed25519 approval key. No enrolment or signing route.
 */
export function createNeopassPsbtReviewer({ rpc, registry, jwtSecret, jwtIssuer, bindings, approvalStore, now = () => Math.floor(Date.now() / 1000) } = {}) {
  if (typeof rpc !== 'function' || typeof now !== 'function') fail('PSBT_REVIEW_CONFIGURATION_REQUIRED')
  if (!isSqliteApprovalStore(approvalStore)) fail('PSBT_DURABLE_APPROVAL_STORE_REQUIRED')
  if (typeof registry?.getNEOpassCredential !== 'function') fail('PSBT_NEOPASS_REGISTRY_REQUIRED')
  if ((typeof jwtSecret !== 'string' && !Buffer.isBuffer(jwtSecret)) || Buffer.byteLength(jwtSecret) < 32 ||
      typeof jwtIssuer !== 'string' || !jwtIssuer || jwtIssuer.length > 256) fail('PSBT_NEOPASS_TRUST_REQUIRED')
  const secret = Buffer.from(jwtSecret)
  const getCredential = registry.getNEOpassCredential.bind(registry)
  if (!Array.isArray(bindings) || bindings.length < 1 || bindings.length > 1_000) fail('PSBT_NEOPASS_BINDINGS_REQUIRED')
  const bySubject = new Map(), ids = new Set()
  for (const binding of bindings) {
    requireFields(binding, ['subject', 'approverId', 'publicKey'])
    const { subject, approverId, publicKey } = binding
    if (typeof subject !== 'string' || !SUBJECT.test(subject) || typeof approverId !== 'string' || !ID.test(approverId) ||
        !(publicKey instanceof KeyObject) || publicKey.type !== 'public' || publicKey.asymmetricKeyType !== 'ed25519' ||
        bySubject.has(subject) || ids.has(approverId)) fail('PSBT_NEOPASS_BINDING_INVALID')
    bySubject.set(subject, Object.freeze({ subject, approverId, publicKey,
      subjectHash: hash(`neo-nvm/neopass-subject-v1\0${subject}`),
      approvalKeyHash: sha256Hex(publicKey.export({ type: 'spki', format: 'der' })) }))
    ids.add(approverId)
  }
  function authenticate(token) {
    if (typeof token !== 'string' || token.length > 8_192 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) fail('PSBT_NEOPASS_SESSION_INVALID')
    const timestamp = now()
    if (!Number.isSafeInteger(timestamp) || timestamp < 0) fail('PSBT_NEOPASS_CLOCK_INVALID')
    const claims = verifyNeopassToken(token, { secret, issuer: jwtIssuer, now: () => timestamp * 1_000 })
    if (!claims || typeof claims.sub !== 'string' || !SUBJECT.test(claims.sub) ||
        !Number.isSafeInteger(claims.iat) || claims.iat < 0 || claims.iat > timestamp ||
        !Number.isSafeInteger(claims.exp) || claims.exp <= timestamp || claims.exp <= claims.iat || claims.exp - claims.iat > 28_800 ||
        (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf > timestamp)) ||
        claims.token_use !== undefined || claims.scope !== undefined || claims.aud !== undefined) fail('PSBT_NEOPASS_SESSION_INVALID')
    // Only the platform's ordinary session profile is accepted. Browser oracle
    // and Crown attestation tokens never cross this boundary. Roles are ignored.
    return claims.sub
  }
  async function requireActive(token, binding) {
    if (authenticate(token) !== binding.subject) fail('PSBT_NEOPASS_SUBJECT_MISMATCH')
    let record
    try { record = await getCredential(binding.subject) }
    catch { fail('PSBT_NEOPASS_REGISTRY_UNAVAILABLE') }
    if (!record || record.subject !== binding.subject || record.status !== 'active' ||
        record.provider !== 'google' || typeof record.providerSubject !== 'string' ||
        `google:${record.providerSubject}` !== binding.subject) fail('PSBT_NEOPASS_ACTIVE_IDENTITY_REQUIRED')
    authenticate(token)
  }
  return Object.freeze({
    async review(input) {
      requireFields(input, ['token', 'request'])
      const token = input.token
      const subject = authenticate(token)
      const binding = bySubject.get(subject)
      if (!binding) fail('PSBT_NEOPASS_APPROVER_NOT_BOUND')
      const source = input.request
      requireFields(source, ['program', 'psbtBase64', 'intent', 'approval'])
      requireFields(source.approval, ['version', 'authorizerId', 'nonce', 'issuedAt', 'expiresAt', 'psbtHash', 'intentHash', 'signatureHex'])
      // Snapshot the complete review before the registry's first await.
      const program = Object.freeze({ ...source.program })
      const request = Object.freeze({ program, psbtBase64: source.psbtBase64,
        intent: normalizePsbtIntent(source.intent, program), approval: Object.freeze({ ...source.approval }) })
      const commitments = psbtReviewCommitments(request.psbtBase64, request.intent, program)
      await requireActive(token, binding)
      const receipt = await authorizePsbtReview(request, {
        rpc, approverId: binding.approverId, approverPublicKey: binding.publicKey, now,
        consumeApproval: async (nonceKey, expiresAt) => {
          // Do not cache membership across the Core calls. A suspension during
          // review fails closed. Expiry/revocation after reservation burns the
          // nonce; no retry can turn an uncertain result into another approval.
          await requireActive(token, binding)
          const consumed = approvalStore.consumeApproval(nonceKey, expiresAt, {
            subjectHash: binding.subjectHash, approvalKeyHash: binding.approvalKeyHash, ...commitments,
          })
          if (consumed) await requireActive(token, binding)
          return consumed
        },
      })
      return Object.freeze({ ...receipt, identitySource: 'authoritative-neopass-registry',
        neopassSubjectHash: binding.subjectHash, approvalKeyHash: binding.approvalKeyHash,
        approvalStore: 'sqlite', identityRecheckedBeforeAndAfterReservation: true })
    },
    inspectConfiguration: () => Object.freeze({ identitySource: 'authoritative-neopass-registry', boundApprovers: bySubject.size,
      tokenClaimRolesTrusted: false, executiveBootstrapAllowed: false, approvalStore: 'sqlite', signing: false, broadcasting: false }),
  })
}
