// Gate 41: mock-only tenant-scoped idempotency registry.
// Tenant identity MUST originate from authenticated server context, never a caller-supplied tenant field.
// No durable storage, authentication integration, or distributed isolation.
export function createTenantIdempotencyRegistry() {
  const tenants = new Map()
  function valid(value) { return typeof value === 'string' && value.length > 0 && value.length <= 256 }
  function reserve({ authenticatedTenant, key, attempt }) {
    if (!valid(authenticatedTenant) || !valid(key) || !attempt || typeof attempt !== 'object' || Array.isArray(attempt)) {
      return { ok: false, reason: 'invalid_request' }
    }
    let records = tenants.get(authenticatedTenant)
    if (!records) { records = new Map(); tenants.set(authenticatedTenant, records) }
    if (records.has(key)) return { ok: false, reason: 'duplicate' }
    // Copy a restricted, non-secret state field only; never retain arbitrary caller metadata.
    if (attempt.state !== 'reserved') return { ok: false, reason: 'invalid_state' }
    records.set(key, { state: 'reserved' })
    return { ok: true }
  }
  function lookup({ authenticatedTenant, key }) {
    if (!valid(authenticatedTenant) || !valid(key)) return { ok: false, reason: 'invalid_request' }
    const record = tenants.get(authenticatedTenant)?.get(key)
    return record ? { ok: true, attempt: { ...record } } : { ok: false, reason: 'not_found' }
  }
  return { reserve, lookup }
}
