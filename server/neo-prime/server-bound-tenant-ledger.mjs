// Gate 45: MOCK-ONLY server-bound ledger capability.
// Construction and bind() must remain inside trusted server middleware.
// The registry and principal factory must NEVER be exposed to untrusted code.
import { createAuthenticatedTenantResolver } from './authenticated-tenant-context.mjs'

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const permitted = (value, keys) => isRecord(value) &&
  Object.keys(value).every(key => keys.includes(key))

export function createServerBoundTenantLedger({ principalFactory, registry } = {}) {
  if (!principalFactory || typeof principalFactory.isMinted !== 'function' ||
      !registry || typeof registry.reserve !== 'function' || typeof registry.lookup !== 'function') {
    throw new TypeError('trusted_ledger_dependencies_required')
  }
  const resolve = createAuthenticatedTenantResolver(principalFactory)

  // Bind only a previously verified, factory-attested principal. Never accept
  // authenticatedTenant, tenantId or a serialized principal from user input.
  function bind(context) {
    try {
      if (!permitted(context, ['verifiedPrincipal', 'requestBody', 'requestQuery', 'requestHeaders'])) {
        return { ok: false, reason: 'invalid_context' }
      }
      const decision = resolve(context)
      if (!decision.ok) return { ok: false, reason: decision.reason }
      // Private closure: the tenant is NOT a parameter to any exposed operation.
      const authenticatedTenant = decision.authenticatedTenant

      const operations = Object.freeze({
        reserve(input) {
          try {
            if (!permitted(input, ['key', 'attempt']) ||
                !isRecord(input.attempt) ||
                !permitted(input.attempt, ['state']) ||
                input.attempt.state !== 'reserved') {
              return { ok: false, reason: 'invalid_operation' }
            }
            return registry.reserve({
              authenticatedTenant,
              key: input.key,
              attempt: { state: 'reserved' },
            })
          } catch {
            return { ok: false, reason: 'ledger_unavailable' }
          }
        },
        lookup(input) {
          try {
            if (!permitted(input, ['key'])) {
              return { ok: false, reason: 'invalid_operation' }
            }
            return registry.lookup({ authenticatedTenant, key: input.key })
          } catch {
            return { ok: false, reason: 'ledger_unavailable' }
          }
        },
      })
      return { ok: true, operations }
    } catch {
      return { ok: false, reason: 'authentication_required' }
    }
  }

  return Object.freeze({ bind })
}
