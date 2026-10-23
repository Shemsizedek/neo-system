// Gate 38: persistence adapter contract wrapper for isolated failure injection.
// This is not durable persistence. A real adapter must supply transactional guarantees.
export function createFaultInjectingLedgerAdapter(ledger, { failAt = [] } = {}) {
  if (!ledger || typeof ledger.reserve !== 'function' || typeof ledger.finalize !== 'function') {
    throw new TypeError('invalid_ledger_adapter')
  }
  const failures = new Set(failAt)
  const calls = []
  function invoke(operation, args) {
    calls.push(operation)
    if (failures.has(operation)) {
      return { ok: false, reason: 'injected_storage_failure' }
    }
    return ledger[operation](...args)
  }
  return {
    reserve: (...args) => invoke('reserve', args),
    start: (...args) => invoke('start', args),
    unknown: (...args) => invoke('unknown', args),
    finalize: (...args) => invoke('finalize', args),
    snapshot: () => ledger.snapshot(),
    calls: () => [...calls],
  }
}
