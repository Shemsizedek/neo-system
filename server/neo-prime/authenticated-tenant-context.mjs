// Gate 44: mock-only tenant resolver bound to one principal factory.
// A trusted server must privately construct both the credential verifier and resolver.
// This is NOT authentication middleware and does not verify tokens itself.
const valid = value => typeof value === 'string' && value.length > 0 && value.length <= 256
const tenantOverrideKeys = new Set(['tenantid', 'tenant_id', 'x-tenant-id'])

export function createAuthenticatedTenantResolver(principalFactory) {
  if (!principalFactory || typeof principalFactory.isMinted !== 'function') {
    throw new TypeError('principal_factory_required')
  }
  // The attestor is captured during trusted server initialization, not provided per request.
  const isAuthentic = principal => {
    try { return principalFactory.isMinted(principal) === true } catch { return false }
  }
  return function resolveAuthenticatedTenant({ verifiedPrincipal, requestBody, requestQuery, requestHeaders } = {}) {
    // Provenance is checked BEFORE relying on any principal fields.
    if (!verifiedPrincipal || typeof verifiedPrincipal !== 'object' || Array.isArray(verifiedPrincipal) ||
        !isAuthentic(verifiedPrincipal) || verifiedPrincipal.verified !== true ||
        !valid(verifiedPrincipal.subject) || !valid(verifiedPrincipal.tenantId)) {
      return { ok: false, reason: 'authentication_required' }
    }
    for (const source of [requestBody, requestQuery, requestHeaders]) {
      if (!source || typeof source !== 'object') continue
      for (const key of Object.keys(source)) {
        if (tenantOverrideKeys.has(key.toLowerCase())) {
          return { ok: false, reason: 'tenant_override_forbidden' }
        }
      }
    }
    return { ok: true, authenticatedTenant: verifiedPrincipal.tenantId }
  }
}
