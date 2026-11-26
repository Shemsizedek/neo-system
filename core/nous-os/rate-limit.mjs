/** Bounded, per-process request gate. Never trust client supplied X-Forwarded-For. */
export function createRequestGate({ limit = 60, windowMs = 60000, maxClients = 2048, now = () => Date.now() } = {}) {
  if (![limit, windowMs, maxClients].every(x => Number.isSafeInteger(x) && x > 0)) throw new TypeError('invalid_rate_limit_configuration');
  const clients = new Map();
  return {
    allow(remoteAddress = '') {
      const key = typeof remoteAddress === 'string' && remoteAddress.length < 128 ? remoteAddress : 'unknown';
      const epoch = now();
      const current = clients.get(key);
      if (current && epoch - current.started < windowMs) {
        if (current.count >= limit) return false;
        current.count += 1;
        return true;
      }
      if (clients.size >= maxClients) {
        for (const [candidate, record] of clients) {
          if (epoch - record.started >= windowMs) clients.delete(candidate);
        }
        if (clients.size >= maxClients && !clients.has(key)) return false;
      }
      clients.set(key, { count: 1, started: epoch });
      return true;
    },
    mode: 'local-per-process',
  };
}
