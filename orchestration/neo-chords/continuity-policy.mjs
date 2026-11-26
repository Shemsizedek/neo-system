/**
 * Provider-independent Chords placement evidence checks, no DNS or deployment changes.
 * Reuses the separate NEO Network Fabric and Continuity policies; does not replace them.
 * Verified flag must come from independently inspected external evidence.
 */
const validName = s => typeof s === 'string' && s.length > 0 && s.length <= 180;
function audited(rows, fields, extra = () => true) {
  return Array.isArray(rows) ? rows.filter(r => r && r.verified === true
    && fields.every(field => validName(r[field])) && extra(r)) : [];
}
function independentPairs(rows, keys) {
  const pairs = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    if (keys.every(k => rows[i][k] !== rows[j][k])) pairs.push([rows[i], rows[j]]);
  }
  return pairs;
}
function plane(name, rows, keys) {
  const pairs = independentPairs(rows, keys);
  return Object.freeze({
    name, status: pairs.length ? 'READY' : 'BLOCKED',
    verifiedCandidates: rows.length,
    independentCandidates: pairs.length ? pairs[0].map(x => x.id) : [],
    reason: pairs.length ? null : `two_verified_independent_${name}_required`
  });
}

export function assessChordsContinuity({ computeNodes = [], namingRoutes = [], storageCopies = [] } = {}) {
  const compute = audited(computeNodes, ['id','provider','failureDomain'], x => x.health === 'HEALTHY' && x.attested === true);
  const naming = audited(namingRoutes, ['id','controller','rootDomain'], x => x.reachable === true);
  const storage = audited(storageCopies, ['id','provider','failureDomain'], x => x.restoreTested === true && x.encrypted === true);
  const planes = {
    compute: plane('compute', compute, ['id','provider','failureDomain']),
    naming: plane('naming', naming, ['id','controller','rootDomain']),
    storage: plane('storage', storage, ['id','provider','failureDomain'])
  };
  const blocked = Object.values(planes).filter(x => x.status === 'BLOCKED').map(x => x.reason);
  return Object.freeze({
    state: blocked.length ? 'BLOCKED' : 'READY_FOR_INDEPENDENT_REVIEW',
    planes,
    blockers: blocked,
    changesApplied: false,
    automaticDnsCutoverAllowed: false,
    automaticDatabasePromotionAllowed: false,
    note: 'Verified candidate metadata is not a live failover drill or a production availability guarantee.'
  });
}
