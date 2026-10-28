// NEO-CROWN-033 institutional onboarding release controller.
// Pure, fail-closed, no secret handling, signing, issuance or broadcasts.
export const STAGES=Object.freeze(['draft','client_review','identity_verified','asset_review','issuer_authorized','ready_for_signing','broadcasted','reconciled','published']);
const required=(v)=>typeof v==='string'&&v.trim().length>0;
const isHex64=(v)=>typeof v==='string'&&/^[a-f0-9]{64}$/i.test(v);
export function evaluateCrownCase(record, evidence={}) {
 const issues=[];
 if(!record || record.schema!=='NEO-CROWN-CASE-V1') issues.push('invalid_case_schema');
 if(!required(record?.case_id)) issues.push('case_id_required');
 if(!required(record?.client_ref)) issues.push('client_reference_required');
 if(!required(record?.asset)) issues.push('asset_required');
 if(!['bitcoin-mainnet'].includes(record?.network)) issues.push('unsupported_network');
 if(record?.protocol!=='counterparty') issues.push('unsupported_protocol');
 if(!['draft','client_review','identity_verified','asset_review','issuer_authorized','ready_for_signing','broadcasted','reconciled','published'].includes(record?.stage)) issues.push('invalid_stage');
 const stage=record?.stage;
 const idx=STAGES.indexOf(stage);
 if(idx>=STAGES.indexOf('identity_verified') && evidence.identity_review_approved!==true) issues.push('identity_review_missing');
 if(idx>=STAGES.indexOf('asset_review') && evidence.asset_legal_review_approved!==true) issues.push('legal_review_missing');
 if(idx>=STAGES.indexOf('issuer_authorized')) {
  if(evidence.issuer_authorization_verified!==true) issues.push('issuer_authorization_missing');
  if(evidence.dual_approval_verified!==true) issues.push('dual_approval_missing');
  if(!isHex64(evidence.media_sha256)) issues.push('media_hash_missing');
  if(evidence.media_host_hash_verified!==true) issues.push('media_publication_unverified');
  if(evidence.confidential_data_encrypted!==true) issues.push('encryption_unverified');
 }
 if(idx>=STAGES.indexOf('ready_for_signing')) {
  if(evidence.preflight_validation_passed!==true) issues.push('preflight_missing');
  if(evidence.issuer_message_signature_verified!==true) issues.push('issuer_signature_missing');
 }
 if(idx>=STAGES.indexOf('broadcasted') && !isHex64(evidence.broadcast_txid)) issues.push('transaction_id_missing');
 if(idx>=STAGES.indexOf('reconciled')) {
  if(evidence.independent_counterparty_ledger_verified!==true) issues.push('ledger_reconciliation_missing');
  if(evidence.issuer_ownership_verified!==true) issues.push('ownership_verification_missing');
 }
 if(idx>=STAGES.indexOf('published') && evidence.public_explorer_verified!==true) issues.push('public_display_not_verified');
 return {case_id:record?.case_id??null,stage:stage??null,allowed:issues.length===0,issues,may_sign:false,may_broadcast:false,mode:'AUDIT_ONLY'};
}
export function requestStage(record,nextStage,evidence) {
 const current=STAGES.indexOf(record?.stage),next=STAGES.indexOf(nextStage);
 if(current<0||next<0||next!==current+1) return {allowed:false,issues:['invalid_transition'],may_sign:false,may_broadcast:false};
 return evaluateCrownCase({...record,stage:nextStage},evidence);
}
