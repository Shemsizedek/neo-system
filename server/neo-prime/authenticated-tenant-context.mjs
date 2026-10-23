// Gate 42: pure contract for trusted authentication context, not an authenticator.
// Only a server-side verified principal may provide tenant identity.
// Caller-supplied tenant fields are rejected rather than silently accepted.
const valid = value => typeof value === 'string' && value.length > 0 && value.length <= 256
export function resolveAuthenticatedTenant({ verifiedPrincipal, requestBody, requestQuery, requestHeaders } = {}) {
  if (!verifiedPrincipal || typeof verifiedPrincipal !== 'object' || Array.isArray(verifiedPrincipal) ||
      verifiedPrincipal.verified !== true || !valid(verifiedPrincipal.tenantId)) {
    return { ok: false, reason: 'authentication_required' }
  }
  const untrusted = [requestBody, requestQuery, requestHeaders]
  for (const source of untrusted) {
    if (!source || typeof source !== 'object') continue
    for (const key of Object.keys(source)) {
      if (['tenantid', 'tenant_id', 'x-tenant-id'].includes(key.toLowerCase())) {
        return { ok: false, reason: 'tenant_override_forbidden' }
      }
    }
  }
  return { ok: true, authenticatedTenant: verifiedPrincipal.tenantId }
}
