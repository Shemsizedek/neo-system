// A non-executing gate rehearsal only. Evidence flags are review inputs, not
// cryptographic proof and never authorize deployments, key use, or merge.
const gates=Object.freeze([
  ['isolated_rp','Dedicated HTTPS staging RP ID, no production origin'],
  ['disposable_database','Isolated DB principal, migration/restore approval'],
  ['issuer_custody','Signer custody, key rotation and revocation reviewed'],
  ['dual_approver_custody','Two genuinely independent operator custodians verified'],
  ['identity_boundary','Authoritative NEOpass issuer and subject registry verified'],
  ['security_review','Independent security review verdict and findings closed'],
  ['fido2_primary_backup','Two genuine FIDO2 keys tested in a browser'],
  ['recovery_rollback','Recovery, session invalidation and DB rollback evidenced'],
  ['monitoring_and_abuse','Rate limit, audit, alerting and incident process reviewed'],
  ['owner_change_approval','Explicit owner authorization for separate staging only']
]);
export function rehearseNeoKeyStagingRelease(evidence={}) {
  if(evidence===null||typeof evidence!=='object'||Array.isArray(evidence))
    throw Error('neo_key_rehearsal_invalid_evidence');
  const missing=gates.filter(([k])=>evidence[k]?.status!=='verified')
    .map(([key,requirement])=>Object.freeze({key,requirement}));
  // Crucially, the output can NEVER be interpreted as an actual GO order.
  // A complete dossier can only advance to an independently chaired review.
  return Object.freeze({
    mode:'dry-run-no-side-effects',
    decision:missing.length?'NO_GO':'INDEPENDENT_RELEASE_REVIEW_REQUIRED',
    missing:Object.freeze(missing),
    actionsPerformed:Object.freeze([]),
    deploymentAuthorized:false
  });
}
export const neoKeyStagingGateRequirements=gates;
