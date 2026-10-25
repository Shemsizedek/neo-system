// Gate 41 registry extended in Gate 46 with MOCK-ONLY tenant-owned transitions.
// In-memory state machine only: no durable quotas, provider billing verification,
// cross-process consistency, authentication, or production authorization.
const validId = value => typeof value === 'string' && value.length > 0 && value.length <= 256
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const validMoney = value => Number.isSafeInteger(value) && value >= 0
const permitted = (value, keys) => isRecord(value) &&
  Object.keys(value).every(key => keys.includes(key))

export function createTenantIdempotencyRegistry() {
  const tenants = new Map()

  function ownRecord(authenticatedTenant, key) {
    // Identical keys in other tenants are intentionally indistinguishable from
    // missing keys. Never consult a global key index.
    if (!validId(authenticatedTenant) || !validId(key)) {
      return { error: { ok: false, reason: 'invalid_request' } }
    }
    const record = tenants.get(authenticatedTenant)?.get(key)
    if (!record) return { error: { ok: false, reason: 'not_found' } }
    return { record }
  }

  function reserve({ authenticatedTenant, key, attempt } = {}) {
    if (!validId(authenticatedTenant) || !validId(key) ||
        !permitted(attempt, ['state', 'maxChargeMicrousd']) ||
        attempt.state !== 'reserved') {
      return { ok: false, reason: 'invalid_request' }
    }
    const priced = Object.hasOwn(attempt, 'maxChargeMicrousd')
    if (priced && (!validMoney(attempt.maxChargeMicrousd) || attempt.maxChargeMicrousd === 0)) {
      return { ok: false, reason: 'invalid_charge_limit' }
    }
    let records = tenants.get(authenticatedTenant)
    if (!records) {
      records = new Map()
      tenants.set(authenticatedTenant, records)
    }
    if (records.has(key)) return { ok: false, reason: 'duplicate' }
    const record = priced
      ? { state: 'reserved', maxChargeMicrousd: attempt.maxChargeMicrousd }
      : { state: 'reserved' } // Backward-compatible Gate 45 unpriced mock reservation.
    records.set(key, record)
    return { ok: true }
  }

  function lookup({ authenticatedTenant, key } = {}) {
    const { record, error } = ownRecord(authenticatedTenant, key)
    return error ?? { ok: true, attempt: { ...record } }
  }

  function start({ authenticatedTenant, key } = {}) {
    const { record, error } = ownRecord(authenticatedTenant, key)
    if (error) return error
    if (record.state !== 'reserved') return { ok: false, reason: 'invalid_transition' }
    if (!Object.hasOwn(record, 'maxChargeMicrousd')) {
      return { ok: false, reason: 'reservation_limit_required' }
    }
    record.state = 'started'
    return { ok: true }
  }

  function unknown({ authenticatedTenant, key } = {}) {
    const { record, error } = ownRecord(authenticatedTenant, key)
    if (error) return error
    if (!['reserved', 'started'].includes(record.state) ||
        !Object.hasOwn(record, 'maxChargeMicrousd')) {
      return { ok: false, reason: 'invalid_transition' }
    }
    record.state = 'unknown'
    // Amount remains reserved conceptually; this mock does not debit budgets.
    return { ok: true }
  }

  function charge({ authenticatedTenant, key, billedMicrousd } = {}, transition) {
    const { record, error } = ownRecord(authenticatedTenant, key)
    if (error) return error
    const expected = transition === 'reconcile' ? 'unknown' : 'started'
    if (record.state !== expected) return { ok: false, reason: 'invalid_transition' }
    if (!Object.hasOwn(record, 'maxChargeMicrousd') ||
        !validMoney(billedMicrousd) || billedMicrousd > record.maxChargeMicrousd) {
      return { ok: false, reason: 'invalid_charge' }
    }
    // Costs are caller-provided TEST VALUES, not verified provider invoices.
    record.state = transition === 'reconcile' ? 'reconciled' : 'settled'
    record.billedMicrousd = billedMicrousd
    return { ok: true }
  }

  function settle(input) { return charge(input, 'settle') }
  function reconcile(input) { return charge(input, 'reconcile') }

  return Object.freeze({ reserve, lookup, start, unknown, settle, reconcile })
}
