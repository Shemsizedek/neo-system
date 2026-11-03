// NEO-OMARCHY-005 — staging-only Ed25519 operator approvals.
// Keys are injected from an independently reviewed trust registry; never created here.
import { createPublicKey, verify } from 'node:crypto'

const HEX = /^[0-9a-f]{64}$/i
const BASE64URL = /^[A-Za-z0-9_-]+$/
const SUBJECT = /^neo:operator:[a-z0-9][a-z0-9._-]{0,63}$/
const ACTIONS = Object.freeze({
  'task.queue': 'omarchy:task:queue',
  'machine.approve': 'omarchy:machine:approve',
  'machine.revoke': 'omarchy:machine:revoke',
})
const canonical = v => Array.isArray(v) ? v.map(canonical) :
  v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v

export const operatorApprovalBytes = claims => Buffer.from(JSON.stringify(canonical(claims)))

export function createOperatorApprovalVerifier({
  publicKeyPem, keyId, now = () => Date.now(), revokedKeyIds = () => false,
} = {}) {
  if (typeof keyId !== 'string' || !/^[A-Za-z0-9._:-]{1,96}$/.test(keyId) ||
      typeof revokedKeyIds !== 'function') throw new Error('operator_trust_configuration_required')
  let key
  try {
    key = createPublicKey(publicKeyPem)
    if (key.asymmetricKeyType !== 'ed25519') throw new Error('wrong_algorithm')
  } catch { throw new Error('operator_ed25519_public_key_required') }
  return async function verifySignedApproval(envelope, { action, target } = {}) {
    const deny = { verified: false, reason: 'operator_approval_unverified' }
    try {
      if (!ACTIONS[action] || typeof target !== 'string' || target.length > 96 ||
          !envelope || typeof envelope !== 'object' || Array.isArray(envelope) ||
          Object.keys(envelope).sort().join(',') !== ['keyId','payload','signature'].sort().join(',') ||
          envelope.keyId !== keyId ||
          typeof envelope.payload !== 'string' || !BASE64URL.test(envelope.payload) ||
          envelope.payload.length > 3072 ||
          typeof envelope.signature !== 'string' || !BASE64URL.test(envelope.signature)) return deny
      const signature = Buffer.from(envelope.signature, 'base64url')
      const payload = Buffer.from(envelope.payload, 'base64url')
      if (signature.length !== 64 || signature.toString('base64url') !== envelope.signature ||
          !payload.length || payload.length > 2048 ||
          payload.toString('base64url') !== envelope.payload ||
          !verify(null, payload, key, signature)) return deny
      const claims = JSON.parse(payload.toString('utf8'))
      const required = ['schema','aud','environment','subject','action','target','scope','nonce','iat','exp']
      if (payload.toString('utf8') !== operatorApprovalBytes(claims).toString('utf8') ||
          !claims || Object.keys(claims).sort().join(',') !== required.sort().join(',') ||
          claims.schema !== 'NEO-OMARCHY-APPROVAL-005' ||
          claims.aud !== 'neo-omarchy-staging' || claims.environment !== 'staging' ||
          !SUBJECT.test(claims.subject || '') || claims.action !== action ||
          claims.target !== target || claims.scope !== ACTIONS[action] ||
          !HEX.test(claims.nonce || '')) return deny
      const t = now()
      if (!Number.isSafeInteger(t) || !Number.isSafeInteger(claims.iat) ||
          !Number.isSafeInteger(claims.exp) || claims.iat > t + 5_000 ||
          claims.iat < t - 120_000 || claims.exp <= t ||
          claims.exp - claims.iat > 120_000) return deny
      if ((await revokedKeyIds(keyId)) !== false) return deny
      return {
        verified: true, action, target, scope: ACTIONS[action],
        subject: claims.subject, expiresAt: claims.exp, nonce: claims.nonce,
      }
    } catch { return deny }
  }
}
