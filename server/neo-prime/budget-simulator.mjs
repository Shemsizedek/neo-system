// Gate 34: deterministic, in-memory budget simulator. Not a distributed or production ledger.
// All monetary values are nonnegative safe integers in micro-USD.
const valid = n => Number.isSafeInteger(n) && n >= 0
export function createBudgetSimulator({ capMicrousd } = {}) {
  if (!valid(capMicrousd)) throw new TypeError('invalid_budget_cap')
  const reservations = new Map()
  let reserved = 0
  let settled = 0
  function reserve({ key, amountMicrousd }) {
    if (typeof key !== 'string' || !key || !valid(amountMicrousd) || amountMicrousd === 0) {
      return { allowed: false, reason: 'invalid_reservation' }
    }
    if (reservations.has(key)) return { allowed: false, reason: 'duplicate_reservation' }
    if (amountMicrousd > capMicrousd - reserved - settled) {
      return { allowed: false, reason: 'budget_exhausted' }
    }
    reservations.set(key, { amountMicrousd, status: 'reserved', costMicrousd: null })
    reserved += amountMicrousd
    return { allowed: true }
  }
  function settle({ key, costMicrousd }) {
    const entry = reservations.get(key)
    if (!entry || entry.status !== 'reserved') return { allowed: false, reason: 'not_reservable' }
    if (!valid(costMicrousd) || costMicrousd > entry.amountMicrousd) {
      return { allowed: false, reason: 'invalid_settlement' }
    }
    reserved -= entry.amountMicrousd
    settled += costMicrousd
    entry.status = 'settled'
    entry.costMicrousd = costMicrousd
    return { allowed: true }
  }
  function markUnknown(key) {
    const entry = reservations.get(key)
    if (!entry || entry.status !== 'reserved') return { allowed: false, reason: 'not_reservable' }
    entry.status = 'unknown'
    return { allowed: true }
  }
  function snapshot() {
    return { capMicrousd, reservedMicrousd: reserved, settledMicrousd: settled,
      availableMicrousd: capMicrousd - reserved - settled,
      entries: [...reservations.entries()].map(([key, entry]) => ({ key, ...entry })) }
  }
  return { reserve, settle, markUnknown, snapshot }
}
