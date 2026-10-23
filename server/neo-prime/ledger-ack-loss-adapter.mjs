// Gate 39: mock post-commit acknowledgment-loss wrapper.
// The operation executes once, but the first success acknowledgment can be lost.
// No persistence, external provider calls, or cross-process guarantee.
export function createAckLossAdapter(ledger, { loseFirstAckFor = [] } = {}) {
  if (!ledger || typeof ledger.reserve !== 'function' || typeof ledger.finalize !== 'function' || typeof ledger.snapshot !== 'function') {
    throw new TypeError('invalid_ledger_adapter')
  }
  const pending = new Set(loseFirstAckFor)
  const calls = []
  function invoke(operation, args) {
    const result = ledger[operation](...args)
    calls.push({ operation, committed: result.ok === true })
    if (result.ok === true && pending.has(operation)) {
      pending.delete(operation)
      return { ok: false, reason: 'acknowledgment_lost', commitOutcome: 'unknown' }
    }
    return result
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
