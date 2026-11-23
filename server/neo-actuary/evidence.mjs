// NEO-ACT-003: documentary inputs are not verified assets.
export function classifyEvidence({id,type,sourceId}) {
  if (![id,type,sourceId].every(v=>typeof v==='string' && v.trim())) throw new TypeError('Evidence fields required');
  return Object.freeze({id,type,sourceId,valuationEligible:false,verifiedOwnership:false,status:'DOCUMENTARY_LEAD',reviewRequired:['source authenticity','legal rights','custody','valuation','liability classification']});
}
export function validateQuote({assetId,currency,priceMinor,quoteTime,asOf,sourceId,ownershipEvidenceId,custodyEvidenceId}) {
  if (![assetId,currency,sourceId,ownershipEvidenceId,custodyEvidenceId].every(v=>typeof v==='string'&&v.trim())) throw new TypeError('Evidence references required');
  if (!/^(0|[1-9][0-9]*)$/.test(priceMinor)) throw new TypeError('Integer minor-unit price required');
  if (!/^[A-Z]{3}$/.test(currency)) throw new TypeError('Currency code required');
  const t=Date.parse(quoteTime),a=Date.parse(asOf);
  if(!Number.isFinite(t)||!Number.isFinite(a)||t>a||a-t>86400000) throw new RangeError('Quote missing, stale or future dated');
  return {assetId,currency,priceMinor,quoteTime,sourceId,ownershipEvidenceId,custodyEvidenceId,status:'PENDING_INDEPENDENT_VERIFICATION',valuationEligible:false};
}
