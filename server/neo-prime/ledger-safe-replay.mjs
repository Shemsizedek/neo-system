// Gate 40: mock-only read-only replay decision helper.
// Never authorize a paid provider retry based only on a found reservation.
const states = new Set(['reserved', 'started', 'unknown', 'settled', 'reconciled'])
export function evaluateReplay({ attempt, lookupFailed = false } = {}) {
  if (lookupFailed) return { action: 'deny', reason: 'lookup_unavailable', invokeProvider: false }
  if (attempt == null) return { action: 'new_reservation_required', reason: 'not_found', invokeProvider: false }
  if (typeof attempt !== 'object' || Array.isArray(attempt) || !states.has(attempt.state)) {
    return { action: 'deny', reason: 'invalid_attempt_state', invokeProvider: false }
  }
  if (attempt.state === 'settled' || attempt.state === 'reconciled') {
    return { action: 'return_existing_result', reason: attempt.state, invokeProvider: false }
  }
  if (attempt.state === 'unknown') {
    return { action: 'reconcile', reason: 'charge_uncertain', invokeProvider: false }
  }
  return { action: 'inspect', reason: attempt.state === 'reserved' ? 'invocation_not_proven_absent' : 'provider_may_have_started', invokeProvider: false }
}
