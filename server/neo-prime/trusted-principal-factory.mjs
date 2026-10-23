// Gate 43: isolated trusted-principal contract, NOT a credential verifier.
// A real authentication middleware must privately own the factory and validate credentials.
// A module export cannot itself guarantee callers are trusted.
const valid = x => typeof x === 'string' && x.length > 0 && x.length <= 256
export function createPrincipalFactory(verifyIdentity) {
  if (typeof verifyIdentity !== 'function') throw new TypeError('verifier_required')
  // Keep provenance scoped to this factory: a different factory cannot attest its objects.
  const minted = new WeakSet()
  return Object.freeze({
    async authenticate(credential) {
      let identity
      try { identity = await verifyIdentity(credential) } catch { return { ok: false, reason: 'authentication_failed' } }
      if (!identity || typeof identity !== 'object' || !valid(identity.subject) || !valid(identity.tenantId)) {
        return { ok: false, reason: 'authentication_failed' }
      }
      const principal = Object.freeze(Object.assign(Object.create(null), {
        verified: true, subject: identity.subject, tenantId: identity.tenantId,
      }))
      minted.add(principal)
      return { ok: true, principal }
    },
    isMinted(principal) { return !!principal && typeof principal === 'object' && minted.has(principal) },
  })
}
