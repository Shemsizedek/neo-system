// Gate 37: mock-only transactional ledger contract. No database or provider integration.
// In-process atomic operations model expected adapter semantics; not durable or distributed.
const money = value => Number.isSafeInteger(value) && value >= 0
export function createLedgerContractMock({ capMicrousd }) {
  if (!money(capMicrousd)) throw new TypeError('invalid_cap')
  const entries = new Map()
  let reserved = 0
  let settled = 0
  const available = () => capMicrousd - reserved - settled
  function reserve(key, amountMicrousd) {
    if (typeof key !== 'string' || !key || !money(amountMicrousd) || amountMicrousd === 0) return { ok: false, reason: 'invalid' }
    if (entries.has(key)) return { ok: false, reason: 'duplicate', state: entries.get(key).state }
    if (amountMicrousd > available()) return { ok: false, reason: 'exhausted' }
    entries.set(key, { state: 'reserved', amountMicrousd, billedMicrousd: null })
    reserved += amountMicrousd
    return { ok: true }
  }
  function start(key) {
    const entry = entries.get(key)
    if (!entry || entry.state !== 'reserved') return { ok: false, reason: 'invalid_transition' }
    entry.state = 'started'
    return { ok: true }
  }
  function unknown(key) {
    const entry = entries.get(key)
    if (!entry || !['reserved', 'started'].includes(entry.state)) return { ok: false, reason: 'invalid_transition' }
    entry.state = 'unknown'
    return { ok: true }
  }
  function finalize(key, billedMicrousd, { reconciled = false } = {}) {
    const entry = entries.get(key)
    if (!entry || (reconciled ? entry.state !== 'unknown' : !['reserved', 'started'].includes(entry.state))) {
      return { ok: false, reason: 'invalid_transition' }
    }
    if (!money(billedMicrousd) || billedMicrousd > entry.amountMicrousd) return { ok: false, reason: 'invalid_charge' }
    reserved -= entry.amountMicrousd
    settled += billedMicrousd
    entry.state = reconciled ? 'reconciled' : 'settled'
    entry.billedMicrousd = billedMicrousd
    return { ok: true }
  }
  function snapshot() {
    return { capMicrousd, reservedMicrousd: reserved, settledMicrousd: settled, availableMicrousd: available(),
      entries: [...entries.entries()].map(([key, value]) => ({ key, ...value })) }
  }
  return { reserve, start, unknown, finalize, snapshot }
}
