// NEO-OMARCHY-006: proposed NEOpass-issued, device-key-bound enrollment proof.
// A verifier contract, NOT a live NEOpass issuer or an automatically trusted CA.
import { createHash, createPublicKey, verify } from 'node:crypto'

const MACHINE = /^neo:machine:[a-z0-9][a-z0-9-]{0,63}$/
const SHA = /^[0-9a-f]{64}$/i
const BASE64 = /^[A-Za-z0-9_-]+$/
const MAX_MS = 5 * 60_000
const CLAIMS = ['aud','cnf','exp','iat','iss','jti','nonce','schema','scope','sub']
const AUD = 'neo-omarchy-device-006'
const canonical = v => Array.isArray(v) ? v.map(canonical) :
  v && typeof v === 'object' && !Array.isArray(v) ?
    Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v
export const proofBytes = claims => Buffer.from(JSON.stringify(canonical(claims)))
export const devicePossessionBytes = ({ machineId, nonce, publicKeyFingerprint, proofId }) =>
  proofBytes({
    schema:'NEO-OMARCHY-DEVICE-POSSESSION-006',
    machineId, nonce, publicKeyFingerprint, proofId,
  })
const isStrict = (value, expected) => value && typeof value === 'object' &&
  !Array.isArray(value) && Object.keys(value).sort().join(',') === [...expected].sort().join(',')
const decodeSignature = value => {
  if (typeof value !== 'string' || !BASE64.test(value) || value.length > 256) return null
  const bytes=Buffer.from(value,'base64url')
  return bytes.length===64 && bytes.toString('base64url')===value ? bytes : null
}

export function createDeviceBoundNEOpassVerifier({
  issuer, keyId, publicKeyPem, isRevoked, now = () => Date.now(),
} = {}) {
  if (!/^neopass:[a-z0-9._:-]+$/.test(issuer || '') ||
      !/^[A-Za-z0-9._:-]{1,96}$/.test(keyId || '') ||
      typeof isRevoked !== 'function') throw new Error('neopass_device_issuer_required')
  let issuerKey
  try {
    issuerKey = createPublicKey(publicKeyPem)
    if (issuerKey.asymmetricKeyType!=='ed25519') throw new Error('unsupported')
  } catch { throw new Error('neopass_ed25519_public_key_required') }
  const issuerKeyFingerprint=createHash('sha256')
    .update(issuerKey.export({type:'spki',format:'der'})).digest('hex')
  return async function verifyDevice({
    machineId, nonce, proof, devicePublicKeyPem, possessionSignature,
  }={}) {
    const denied={verified:false,reason:'device_enrollment_unverified'}
    try {
      if (!MACHINE.test(machineId || '') || !SHA.test(nonce || '') ||
          !isStrict(proof,['keyId','payload','signature','algorithm']) ||
          proof.keyId!==keyId || proof.algorithm!=='Ed25519' ||
          typeof proof.payload!=='string' || !BASE64.test(proof.payload) ||
          proof.payload.length>4096) return denied
      const issuerSig=decodeSignature(proof.signature)
      const raw=Buffer.from(proof.payload,'base64url')
      if (!issuerSig || !raw.length || raw.length>2048 ||
          raw.toString('base64url')!==proof.payload ||
          !verify(null,raw,issuerKey,issuerSig)) return denied
      const claims=JSON.parse(raw.toString('utf8'))
      if (!isStrict(claims,CLAIMS) ||
          raw.toString('utf8')!==proofBytes(claims).toString('utf8') ||
          claims.schema!=='NEO-OMARCHY-DEVICE-PROOF-006' ||
          claims.iss!==issuer || claims.aud!==AUD || claims.sub!==machineId ||
          claims.nonce!==nonce || claims.scope!=='omarchy:device:enroll' ||
          !SHA.test(claims.cnf || '') || !SHA.test(claims.jti || '')) return denied
      const time=now()
      if (!Number.isSafeInteger(time) ||
          !Number.isSafeInteger(claims.iat) || !Number.isSafeInteger(claims.exp) ||
          claims.iat>time+5_000 || claims.iat<time-MAX_MS ||
          claims.exp<=time || claims.exp<=claims.iat ||
          claims.exp-claims.iat>MAX_MS) return denied
      let deviceKey
      try {
        deviceKey=createPublicKey(devicePublicKeyPem)
        if (deviceKey.asymmetricKeyType!=='ed25519') return denied
      } catch {return denied}
      const fingerprint=createHash('sha256')
        .update(deviceKey.export({type:'spki',format:'der'})).digest('hex')
      if (fingerprint!==claims.cnf.toLowerCase()) return denied
      const possessionSig=decodeSignature(possessionSignature)
      if (!possessionSig || !verify(null,devicePossessionBytes({
        machineId,nonce,publicKeyFingerprint:fingerprint,proofId:claims.jti,
      }),deviceKey,possessionSig)) return denied
      // Explicit 'not revoked' is required; undefined/offline fails closed.
      if ((await isRevoked({issuer,keyId,machineId,proofId:claims.jti,
        publicKeyFingerprint:fingerprint}))!==false) return denied
      return {
        verified:true, machineId, nonce, proofId:claims.jti.toLowerCase(),
        expiresAt:claims.exp, keyFingerprint:issuerKeyFingerprint,
        devicePublicKeyPem:deviceKey.export({format:'pem',type:'spki'}),
        deviceKeyFingerprint:fingerprint,
        audience:AUD, issuer:'NEOpass',
      }
    } catch {return denied}
  }
}
