// NEO-OMARCHY-004: pinned-key, signed NEOpass machine-proof verifier.
// Verifier adapter only, not a live issuer or production identity service.
import { createHash, createPublicKey, verify } from 'node:crypto'

const MACHINE = /^neo:machine:[a-z0-9][a-z0-9-]{0,63}$/
const HEX64 = /^[a-f0-9]{64}$/i
const KEY_ID = /^[a-zA-Z0-9._:-]{1,96}$/
const AUDIENCE = 'neo-omarchy-machine-v1'
const MAX_LIFETIME_MS = 5 * 60_000
const base64 = /^[A-Za-z0-9_-]+$/
const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value && typeof value === 'object' ?
    Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value

export function createPinnedNEOpassVerifier({
  issuer, keyId, publicKeyPem, now = () => Date.now(), isRevoked,
} = {}) {
  if (typeof issuer !== 'string' || !/^neopass:[a-z0-9._:-]+$/.test(issuer) ||
      !KEY_ID.test(keyId || '') || typeof isRevoked !== 'function') {
    throw new Error('trusted_neopass_issuer_configuration_required')
  }
  let key
  try {
    key = createPublicKey(publicKeyPem)
    if (key.asymmetricKeyType !== 'ed25519') throw new Error('not_ed25519')
  } catch { throw new Error('trusted_ed25519_public_key_required') }
  const keyFingerprint = createHash('sha256').update(key.export({ format: 'der', type: 'spki' })).digest('hex')
  return async function verifyMachine({ machineId, nonce, proof, audience = AUDIENCE }) {
    const denied = { verified: false, reason: 'neopass_proof_unverified' }
    try {
      if (!MACHINE.test(machineId || '') || !HEX64.test(nonce || '') || audience !== AUDIENCE) return denied
      if (!proof || typeof proof !== 'object' || Array.isArray(proof) ||
          proof.algorithm !== 'Ed25519' || proof.keyId !== keyId ||
          typeof proof.payload !== 'string' || proof.payload.length > 4096 ||
          typeof proof.signature !== 'string' || !base64.test(proof.signature)) return denied
      const signature = Buffer.from(proof.signature, 'base64url')
      if (signature.length !== 64 || signature.toString('base64url') !== proof.signature) return denied
      const raw = Buffer.from(proof.payload, 'base64url')
      if (!raw.length || raw.length > 2048 || raw.toString('base64url') !== proof.payload ||
          !verify(null, raw, key, signature)) return denied
      const claims = JSON.parse(raw.toString('utf8'))
      if (raw.toString('utf8') !== JSON.stringify(canonical(claims)) ||
          !claims || typeof claims !== 'object' || Array.isArray(claims) ||
          Object.keys(claims).sort().join(',') !==
            ['aud', 'exp', 'iat', 'iss', 'jti', 'nonce', 'scope', 'sub'].sort().join(',')) return denied
      const time = now()
      if (!Number.isSafeInteger(time) || claims.iss !== issuer ||
          claims.aud !== AUDIENCE || claims.sub !== machineId ||
          claims.nonce !== nonce || claims.scope !== 'omarchy:machine:enroll' ||
          !HEX64.test(claims.jti || '') ||
          !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
          claims.iat > time + 10_000 || claims.iat < time - MAX_LIFETIME_MS ||
          claims.exp <= time || claims.exp <= claims.iat ||
          claims.exp - claims.iat > MAX_LIFETIME_MS) return denied
      if (await isRevoked({ issuer, keyId, machineId, proofId: claims.jti })) return denied
      return {
        verified: true, issuer: 'NEOpass', machineId, nonce, audience,
        expiresAt: claims.exp, proofId: claims.jti, keyFingerprint,
      }
    } catch { return denied }
  }
}

// No credentials are issued here. Canonical serialization for mock tests only.
export function machineProofPayload(claims) {
  return Buffer.from(JSON.stringify(canonical(claims)))
}
