// Gate 45 server-bound mock ledger extended in Gate 46 to cover all
// ordinary attempt transitions. No HTTP routes, credential verification,
// durable budgets, or real billing integration.
import { createAuthenticatedTenantResolver } from './authenticated-tenant-context.mjs'

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const permitted = (value, keys) => isRecord(value) &&
  Object.keys(value).every(key => keys.includes(key))
const validCharge = value => Number.isSafeInteger(value) && value >= 0

export function createServerBoundTenantLedger({ principalFactory, registry } = {}) {
  const methods = ['reserve', 'lookup', 'start', 'unknown', 'settle', 'reconcile']
  if (!principalFactory || typeof principalFactory.isMinted !== 'function' ||
      !registry || methods.some(method => typeof registry[method] !== 'function')) {
    throw new TypeError('trusted_ledger_dependencies_required')
  }
  const resolve = createAuthenticatedTenantResolver(principalFactory)

  // Bind must run exclusively in trusted server middleware with a privately
  // held factory and registry. Do not expose this binder to untrusted callers.
  function bind(context) {
    try {
      if (!permitted(context, ['verifiedPrincipal', 'requestBody', 'requestQuery', 'requestHeaders'])) {
        return { ok: false, reason: 'invalid_context' }
      }
      const decision = resolve(context)
      if (!decision.ok) return { ok: false, reason: decision.reason }
      const authenticatedTenant = decision.authenticatedTenant

      // Each operation only receives explicitly approved fields; callers cannot
      // provide or replace tenant identity in reserve, lookup or any transition.
      function invoke(method, input) {
        try {
          return registry[method]({ authenticatedTenant, ...input })
        } catch {
          return { ok: false, reason: 'ledger_unavailable' }
        }
      }
      function keyOperation(method, input) {
        if (!permitted(input, ['key'])) return { ok: false, reason: 'invalid_operation' }
        return invoke(method, { key: input.key })
      }
      function chargeOperation(method, input) {
        if (!permitted(input, ['key', 'billedMicrousd']) ||
            !validCharge(input.billedMicrousd)) {
          return { ok: false, reason: 'invalid_operation' }
        }
        return invoke(method, { key: input.key, billedMicrousd: input.billedMicrousd })
      }
      const operations = Object.freeze({
        reserve(input) {
          if (!permitted(input, ['key', 'attempt']) ||
              !permitted(input.attempt, ['state', 'maxChargeMicrousd']) ||
              input.attempt.state !== 'reserved' ||
              (Object.hasOwn(input.attempt, 'maxChargeMicrousd') &&
                (!Number.isSafeInteger(input.attempt.maxChargeMicrousd) ||
                  input.attempt.maxChargeMicrousd <= 0))) {
            return { ok: false, reason: 'invalid_operation' }
          }
          const attempt = Object.hasOwn(input.attempt, 'maxChargeMicrousd')
            ? { state: 'reserved', maxChargeMicrousd: input.attempt.maxChargeMicrousd }
            : { state: 'reserved' }
          return invoke('reserve', { key: input.key, attempt })
        },
        lookup(input) { return keyOperation('lookup', input) },
        start(input) { return keyOperation('start', input) },
        unknown(input) { return keyOperation('unknown', input) },
        settle(input) { return chargeOperation('settle', input) },
        reconcile(input) { return chargeOperation('reconcile', input) },
      })
      return { ok: true, operations }
    } catch {
      return { ok: false, reason: 'authentication_required' }
    }
  }

  return Object.freeze({ bind })
}
