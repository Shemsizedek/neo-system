// NDC-002 — deterministic, read-only registry validation and provenance guard.
// No issuance, keys, transfers, custody, or regulated order execution.
export const ORANGE_CLASSES = Object.freeze(['equity','interest','credit','realty','fund','commodity','utility','metal']);
export function validateOrangeChip(record) {
  const errors = [];
  if (!record || typeof record !== 'object' || Array.isArray(record)) return {valid:false,errors:['record must be an object']};
  for (const field of ['id','name','issuer']) if (typeof record[field] !== 'string' || !record[field].trim()) errors.push(field+' required');
  if (!ORANGE_CLASSES.includes(record.asset_class)) errors.push('unsupported asset_class');
  if (record.network !== 'bitcoin' || record.protocol !== 'counterparty') errors.push('Bitcoin/Counterparty required');
  if (!['unverified','source_checked','verified'].includes(record.verification_status)) errors.push('invalid verification_status');
  if (!['unknown','counsel_review_pending','documented'].includes(record.legal_rights_status)) errors.push('invalid legal_rights_status');
  if (!Array.isArray(record.source_refs)) errors.push('source_refs must be an array');
  else for (const ref of record.source_refs) {
    if (!ref || typeof ref.url !== 'string' || !/^https:\/\//.test(ref.url) || !Number.isFinite(Date.parse(ref.retrieved_at))) errors.push('invalid source reference');
  }
  if (record.supply != null && (typeof record.supply !== 'string' || !/^(0|[1-9]\\d*)(\\.\\d+)?$/.test(record.supply))) errors.push('supply must be a nonnegative decimal string');
  return {valid:errors.length===0,errors};
}
export function summarizeOrangeChip(record) {
  const check=validateOrangeChip(record);
  if(!check.valid) return {ok:false,errors:check.errors};
  return {ok:true,id:record.id,asset_class:record.asset_class,network:record.network,protocol:record.protocol,verification_status:record.verification_status,legal_rights_status:record.legal_rights_status,market_eligible:false,issuance_enabled:false};
}
