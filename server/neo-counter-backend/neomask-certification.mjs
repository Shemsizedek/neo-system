// NMASK-038: strict staging readiness classification, no implicit activation.
const REQUIRED=Object.freeze(['neo_pass_oidc','session_revocation','bitcoin_node','counterparty_indexer','asset_issuer_registry','postgres_persistence','frontend_build','integration_tests']);
export function certifyNeoMaskStaging(evidence){
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))throw Error('invalid_evidence');
 const checks=REQUIRED.map(name=>{
  const value=evidence[name];
  const passed=value?.status==='passed'&&typeof value?.artifact==='string'&&value.artifact.length>=8&&value?.environment==='staging';
  return Object.freeze({name,passed,reason:passed?'evidence_recorded':'evidence_missing_or_unverified'});
 });
 const approved=checks.every(x=>x.passed);
 return Object.freeze({gate:'NMASK-038',status:approved?'staging_evidence_complete':'blocked',checks,mainnetSigningEnabled:false,productionSettlementEnabled:false,productionCertified:false});
}
export const REQUIRED_CHECKS=REQUIRED;
