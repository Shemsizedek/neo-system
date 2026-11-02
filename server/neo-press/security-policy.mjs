import { createHash } from 'node:crypto'

const hash = value => createHash('sha256').update(String(value)).digest('hex')

// LOCAL TEST ONLY: process memory is not a distributed rate-limit authority.
export function createLocalPressLimiter({ now = () => Date.now(), windowMs = 60_000, maxRequests = 8 } = {}) {
  if (!Number.isSafeInteger(windowMs) || windowMs < 1000 ||
      !Number.isSafeInteger(maxRequests) || maxRequests < 1) throw new Error('invalid_local_limiter')
  const buckets = new Map()
  return Object.freeze({
    localOnly: true,
    async consume(key) {
      const stamp = now()
      if (!Number.isFinite(stamp)) return false
      const id = hash(key)
      const record = buckets.get(id)
      if (!record || stamp >= record.resetAt) {
        buckets.set(id, { count: 1, resetAt: stamp + windowMs })
        return true
      }
      if (record.count >= maxRequests) return false
      record.count++
      return true
    }
  })
}

// A separately managed press service needs distributed request limits, token
// revocation and independent issuer health. It cannot silently fall back to a
// test limiter, unverified membership, or trusted user-provided headers.
export function createPressSecurityPolicy({
  mode = 'LOCAL_TEST', limiter = null, revocationService = null,
  issuerMonitor = null
} = {}) {
  if (!['LOCAL_TEST', 'PRODUCTION'].includes(mode)) throw new Error('invalid_press_security_mode')
  const complete = mode === 'PRODUCTION' &&
    limiter && limiter.localOnly !== true && typeof limiter.consume === 'function' &&
    revocationService && typeof revocationService.isRevokedToken === 'function' &&
    typeof revocationService.isRevokedSubject === 'function' &&
    issuerMonitor && typeof issuerMonitor.isVerifiedHealthy === 'function'
  return Object.freeze({
    mode,
    productionConfigured: Boolean(complete),
    async authorize({ req, token, subject = null, operation = 'read' } = {}) {
      if (!token || typeof token !== 'string') return { allowed: false, status: 401, error: 'press_token_required' }
      if (mode === 'PRODUCTION' && !complete) {
        return { allowed: false, status: 503, error: 'press_security_dependencies_unavailable' }
      }
      if (mode === 'LOCAL_TEST' && !limiter) return { allowed: true, testOnly: true }
      if (!limiter || typeof limiter.consume !== 'function') {
        return { allowed: false, status: 503, error: 'press_limiter_unavailable' }
      }
      try {
        // Prefer socket address over client-controlled forwarded-for. A real
        // reverse proxy must separately define and verify its trusted hop.
        const source = req?.socket?.remoteAddress || 'unknown'
        const tokenHash = hash(token)
        if (!await limiter.consume('press:' + operation + ':' + source + ':' + tokenHash)) {
          return { allowed: false, status: 429, error: 'press_rate_limit_exceeded' }
        }
        if (mode === 'PRODUCTION') {
          if (await issuerMonitor.isVerifiedHealthy() !== true) {
            return { allowed: false, status: 503, error: 'neopass_issuer_unverified' }
          }
          if (await revocationService.isRevokedToken(tokenHash) !== false ||
              (subject && await revocationService.isRevokedSubject(subject) !== false)) {
            return { allowed: false, status: 401, error: 'press_identity_revoked_or_unconfirmed' }
          }
        }
        return { allowed: true, testOnly: mode !== 'PRODUCTION' }
      } catch {
        return { allowed: false, status: 503, error: 'press_security_dependency_error' }
      }
    }
  })
}
