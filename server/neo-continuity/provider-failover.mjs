import {buildFailoverDecision} from './fabric.mjs'

const named = value => typeof value === 'string' && value.trim().length > 0
const finite = value => typeof value === 'number' && Number.isFinite(value)

// A pure decision function. Evidence must come from trusted probes and inventory;
// no caller-supplied record grants deployment, DNS, or database promotion authority.
export function buildProviderFailoverDecision({
  service, primary, backups = [], capability = 'http', stateful = false,
  alwaysOn = true, preapproved = false, now = new Date(), maxAgeMs = 300000,
  quotaCeiling = 0.8, freeOnly = true,
} = {}) {
  const at = +new Date(now)
  if (!named(service) || !named(capability) || !Number.isFinite(at) ||
      !finite(maxAgeMs) || maxAgeMs <= 0 || !finite(quotaCeiling) ||
      quotaCeiling <= 0 || quotaCeiling > 1) throw new TypeError('invalid failover policy')
  const rows = [primary, ...backups].filter(Boolean)
  const ids = rows.map(row => row.id)
  if (ids.some(id => !named(id)) || new Set(ids).size !== ids.length) {
    throw new TypeError('unique candidate ids required')
  }
  const assessments = rows.map(row => {
    const reasons = []
    const isPrimary = row === primary
    const age = at - Date.parse(row.checkedAt)
    if (row.status !== 'healthy') reasons.push('not_healthy')
    if (!Number.isFinite(age) || age < 0 || age > maxAgeMs) reasons.push('health_not_fresh')
    if (!named(row.provider) || !Array.isArray(row.failureDomains) ||
        !row.failureDomains.length || !row.failureDomains.every(named)) reasons.push('unknown_failure_domains')
    if (!Array.isArray(row.capabilities) || !row.capabilities.includes(capability)) reasons.push('capability_mismatch')
    if (!finite(row.quotaUsed) || !finite(row.quotaLimit) || row.quotaUsed < 0 ||
        row.quotaLimit <= 0 || row.quotaUsed / row.quotaLimit >= quotaCeiling) reasons.push('quota_unavailable')
    if (freeOnly && row.costClass !== 'free') reasons.push('free_capacity_unverified')
    if (alwaysOn && row.alwaysOn !== true) reasons.push('always_on_unverified')
    if (!isPrimary) {
      if (row.provider === primary?.provider || !named(primary?.provider) ||
          !Array.isArray(primary?.failureDomains) || !primary.failureDomains.length ||
          !primary.failureDomains.every(named) ||
          row.failureDomains?.some?.(domain => primary.failureDomains.includes(domain))) reasons.push('independence_unverified')
      if (stateful && (row.restoreVerified !== true || row.replicationFresh !== true)) reasons.push('state_not_ready')
    }
    return {id: row.id, eligible: reasons.length === 0, reasons}
  })
  const eligible = rows.filter((_, index) => assessments[index].eligible)
  const route = buildFailoverDecision({service,
    primary: eligible.find(row => row === primary),
    backups: eligible.filter(row => row !== primary),
    preapproved: preapproved === true && !stateful,
  })
  return {...route, mode: route.selected ? route.mode : 'unavailable',
    assessments, independentBackupReady: eligible.some(row => row !== primary),
    execution: 'decision_only', statefulPromotionRequiresAuthority: stateful}
}
