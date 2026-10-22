import { timingSafeEqual } from 'node:crypto'

// Gate 17 proposal: pure access decision logic. Not wired into the HTTP server.
// No public execution exception is supported until a quota/rate-limit design is approved.
export const ACCESS_TIERS = Object.freeze({
  PUBLIC_UI: 'public_ui',
  PUBLIC_LIVENESS: 'public_liveness',
  AUTHENTICATED_EXECUTION: 'authenticated_execution',
  PRIVILEGED_EXECUTION: 'privileged_execution',
  DENY: 'deny',
})

const PUBLIC_UI_PATHS = new Set(['/', '/oracle', '/oracle/'])
const EXECUTION_PATHS = new Set(['/api/prime', '/prime', '/api/oracle'])

export function classifyPrimeRoute(method, path, approvalRequired = false) {
  if (method === 'GET' && PUBLIC_UI_PATHS.has(path)) return ACCESS_TIERS.PUBLIC_UI
  if (method === 'GET' && path === '/healthz') return ACCESS_TIERS.PUBLIC_LIVENESS
  if (method === 'GET' && path === '/health') return ACCESS_TIERS.AUTHENTICATED_EXECUTION
  if (method === 'POST' && EXECUTION_PATHS.has(path)) {
    return approvalRequired ? ACCESS_TIERS.PRIVILEGED_EXECUTION : ACCESS_TIERS.AUTHENTICATED_EXECUTION
  }
  return ACCESS_TIERS.DENY
}

function validBearer(value, expectedToken) {
  if (typeof expectedToken !== 'string' || !expectedToken || typeof value !== 'string') return false
  const prefix = 'Bearer '
  if (!value.startsWith(prefix)) return false
  const provided = Buffer.from(value.slice(prefix.length))
  const expected = Buffer.from(expectedToken)
  return provided.length === expected.length && timingSafeEqual(provided, expected)
}

export function evaluatePrimeAccess({ method, path, approvalRequired = false, authorization, approved = false, approvalHeader, operatorToken } = {}) {
  const tier = classifyPrimeRoute(method, path, approvalRequired)
  if (tier === ACCESS_TIERS.DENY) return { allowed: false, tier, reason: 'route_denied' }
  if (tier === ACCESS_TIERS.PUBLIC_UI || tier === ACCESS_TIERS.PUBLIC_LIVENESS) return { allowed: true, tier }
  if (!validBearer(authorization, operatorToken)) return { allowed: false, tier, reason: 'authentication_required' }
  if (tier === ACCESS_TIERS.PRIVILEGED_EXECUTION && !(approved === true && approvalHeader === 'approved')) {
    return { allowed: false, tier, reason: 'approval_required' }
  }
  return { allowed: true, tier }
}
