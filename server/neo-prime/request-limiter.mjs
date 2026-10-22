// Gate 25: per-credential bounded in-memory admission control.
// Applies per process only; distributed deployments require a shared store.
export function createRequestLimiter({ limit = 30, windowMs = 60_000, maxKeys = 10_000, now = Date.now } = {}) {
  if (![limit, windowMs, maxKeys].every(value => Number.isSafeInteger(value) && value > 0)) throw new TypeError('invalid_limits')
  const entries = new Map()
  return {
    check(key) {
      if (typeof key !== 'string' || !key) return { allowed: false, reason: 'missing_identity' }
      const time = now()
      for (const [id, entry] of entries) if (entry.resetAt <= time) entries.delete(id)
      let entry = entries.get(key)
      if (!entry) {
        if (entries.size >= maxKeys) return { allowed: false, reason: 'capacity_exceeded' }
        entry = { count: 0, resetAt: time + windowMs }
        entries.set(key, entry)
      }
      if (entry.count >= limit) return { allowed: false, reason: 'rate_limited', retryAfterMs: Math.max(0, entry.resetAt - time) }
      entry.count++
      return { allowed: true, remaining: limit - entry.count }
    },
  }
}
