// Pure evidence model: no network, valuation, postings or execution.
export const COMFI_EVIDENCE_SCHEMA='neo.comfi.evidence.v1';
const kinds=new Set(['token_issuance','token_transfer','instrument','ces_posting','vdollar_posting','external_bank_statement','funding_receipt','government_opportunity']);
const states=new Set(['user_statement','source_observed','source_correlated']);
const types=new Set(['represents','parent_coupon','allocation','conversion','supports_funding','settles']);
function text(value,label){if(typeof value!=='string'||!value.trim())throw Error(label+'_required');return value.trim();}
function exact(value,scale){
  if(typeof value!=='string'||!Number.isInteger(scale)||scale<0||scale>18)throw Error('exact_amount_and_scale_required');
  const m=/^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?$/.exec(value);
  if(!m||(m[3]||'').length>scale||value.length>100)throw Error('invalid_exact_amount');
  return ((m[1]?-1n:1n)*BigInt(m[2]+(m[3]||'').padEnd(scale,'0'))).toString();
}
export function createComfiEvidenceGraph({projectId,records=[],links=[]}={}){
  const project=text(projectId,'project');
  if(!Array.isArray(records)||!Array.isArray(links))throw Error('records_and_links_required');
  const ids=new Set(),keys=new Set();
  const normalized=records.map(r=>{
    const id=text(r.id,'record_id');if(ids.has(id))throw Error('duplicate_record_id');ids.add(id);
    if(!kinds.has(r.kind)||!states.has(r.evidenceState))throw Error('invalid_record_classification');
    const ledger=text(r.ledger,'ledger'),account=text(r.account,'account'),reference=text(r.reference,'reference');
    const key=JSON.stringify([ledger,account,reference]);if(keys.has(key))throw Error('duplicate_ledger_reference');keys.add(key);
    if(!Array.isArray(r.sourceRefs)||!r.sourceRefs.length)throw Error('source_references_required');
    const sourceRefs=r.sourceRefs.map(v=>text(v,'source_reference'));
    const unit=text(r.unit,'unit'),minorUnits=exact(r.amount,r.scale);
    const effectiveDate=text(r.effectiveDate,'effective_date'),observedAt=text(r.observedAt,'observed_at');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate)||!Number.isFinite(Date.parse(effectiveDate))||new Date(effectiveDate).toISOString().slice(0,10)!==effectiveDate||!Number.isFinite(Date.parse(observedAt)))throw Error('invalid_record_date');
    return {id,key,kind:r.kind,ledger,account,reference,unit,scale:r.scale,minorUnits,effectiveDate,observedAt,evidenceState:r.evidenceState,sourceRefs,economicInterestId:r.economicInterestId==null?null:text(r.economicInterestId,'economic_interest')};
  });
  const linkIds=new Set();
  const normalizedLinks=links.map(l=>{
    const id=text(l.id,'link_id');if(linkIds.has(id))throw Error('duplicate_link_id');linkIds.add(id);
    if(!ids.has(l.from)||!ids.has(l.to)||l.from===l.to||!types.has(l.type)||!['candidate','source_referenced'].includes(l.status))throw Error('invalid_evidence_link');
    if(l.sourceRefs!=null&&!Array.isArray(l.sourceRefs))throw Error('invalid_link_sources');
    const sourceRefs=(l.sourceRefs||[]).map(v=>text(v,'link_source')),termsRef=l.termsRef==null?null:text(l.termsRef,'terms_reference');
    if(l.status==='source_referenced'&&(!sourceRefs.length||(l.type==='conversion'&&!termsRef)))throw Error('link_evidence_required');
    return {id,from:l.from,to:l.to,type:l.type,status:l.status,sourceRefs,termsRef};
  });
  const interests=new Map();for(const r of normalized){if(r.economicInterestId){const group=interests.get(r.economicInterestId)||[];group.push(r.id);interests.set(r.economicInterestId,group);}}
  return {schema:COMFI_EVIDENCE_SCHEMA,projectId:project,readOnly:true,records:normalized,links:normalizedLinks,
    sharedEconomicInterests:[...interests].filter(([,g])=>g.length>1).map(([id,recordIds])=>({id,recordIds,consolidationReviewRequired:true})),
    unresolvedLinks:normalizedLinks.filter(l=>l.status==='candidate').map(l=>l.id),
    policy:{automaticConversion:false,automaticAssetRecognition:false,consolidatedValue:null,governmentEligibility:'not_determined',executionEnabled:false}};
}
