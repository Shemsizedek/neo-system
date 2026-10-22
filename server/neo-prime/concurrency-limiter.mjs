// Gate 26: per-process, per-credential concurrent admission.
// This limits concurrent requests, not tokens, dollars or distributed replicas.
export function createConcurrencyLimiter({ perIdentity = 2, globalLimit = 20 } = {}) {
  if (![perIdentity, globalLimit].every(x => Number.isSafeInteger(x) && x > 0)) throw new TypeError('invalid_concurrency_limits')
  const active = new Map()
  let total = 0
  return {
    acquire(identity) {
      if (typeof identity !== 'string' || !identity) return { allowed: false, reason: 'missing_identity' }
      if (total >= globalLimit || (active.get(identity) || 0) >= perIdentity) return { allowed: false, reason: 'concurrency_exceeded' }
      total++
      active.set(identity, (active.get(identity) || 0) + 1)
      let released = false
      return {
        allowed: true,
        release() {
          if (released) return
          released = true
          total--
          const remaining = (active.get(identity) || 1) - 1
          if (remaining) active.set(identity, remaining)
          else active.delete(identity)
        },
      }
    },
  }
}
