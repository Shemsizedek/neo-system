import crypto from 'node:crypto';
const sha = v => crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
const fail = reason => ({status:'HOLD',reason,executionEnabled:false});
const nonnegative = x => typeof x==='number' && Number.isFinite(x) && x>=0;

/** Read-only externally supplied NOMNI/BTC depth proof; no claims of verified market data
 * absent source-authenticated external adapter and independently reproducible records. */
export function evaluateMarketDepth({book,quantity,btcUsd,observedAt=Date.now(),maxAgeMs=300_000}={}) {
  if(!book || book.asset!=='NOMNI' || book.quote!=='BTC' || !book.venue ||
     !book.sourceId || !Number.isFinite(book.timestamp)||book.timestamp>observedAt||
     observedAt-book.timestamp>maxAgeMs || !nonnegative(quantity) || quantity===0||
     !nonnegative(btcUsd) || btcUsd===0 || !Array.isArray(book.bids)) return fail('INVALID_OR_STALE_MARKET_DATA');
  let remaining=quantity,proceeds=0,previous=Infinity;
  for(const bid of book.bids) {
    if(!bid || !nonnegative(bid.priceBtc) || bid.priceBtc===0 || !nonnegative(bid.quantity) ||
       bid.priceBtc>previous) return fail('INVALID_OR_UNSORTED_BOOK');
    previous=bid.priceBtc;
    const fill=Math.min(remaining,bid.quantity);
    proceeds+=fill*bid.priceBtc;remaining-=fill;
    if(remaining===0)break;
  }
  if(remaining>0) return fail('INSUFFICIENT_EXECUTABLE_BID_DEPTH');
  const notionalUsd=proceeds*btcUsd;
  return {status:'INDICATIVE_DEPTH_COVERED',quantity,proceedsBtc:proceeds,notionalUsd,
    effectiveBtcPerNomni:proceeds/quantity,evidenceDigest:sha({book,quantity,btcUsd}),
    authenticatedVenue:false,ordersFirmAndExecutable:false,collateralApproved:false,executionEnabled:false};
}
const allowed = Object.freeze({
  accountant:['ledger','market','chain','attestations'],auditor:['ledger','market','chain','attestations'],
  lawyer:['chain','attestations','legal'],underwriter:['ledger','market','chain','attestations','legal'],
  broker:['market','chain'], 'court-reviewer':['chain','attestations','legal']
});
/** Claims must come from a verified server-side authorization context, never request body. */
export function authorizeProfessionalView({identity,caseRecord,section}={}) {
  if(!identity || identity.authenticated!==true||identity.professionalRegistryVerified!==true||
    identity.mfaVerified!==true||!allowed[identity.role]?.includes(section)||
    !Array.isArray(identity.caseGrants)||!caseRecord?.id||!identity.caseGrants.includes(caseRecord.id))
    return fail('NOT_AUTHORIZED');
  if(caseRecord.classification==='CONFIDENTIAL' && identity.confidentialAccess!==true)
    return fail('CONFIDENTIAL_ACCESS_REQUIRED');
  return {status:'READ_ONLY_AUTHORIZED',caseId:caseRecord.id,section,role:identity.role,
    sessionBound:true,requiresAuditLog:true,executionEnabled:false};
}
export function assembleEvidenceManifest({caseId,chain,market,ledger,attestations}={}) {
  if(!/^[-A-Za-z0-9_]{6,80}$/.test(caseId??'') || !chain?.evidenceDigest)
    return fail('CASE_OR_CHAIN_EVIDENCE_MISSING');
  const records={chain,market,ledger,attestations};
  return {status:'UNSIGNED_MANIFEST',caseId,manifestDigest:sha(records),
    entries:Object.fromEntries(Object.entries(records).map(([k,v])=>[k,v?.evidenceDigest??v?.evidenceId??null])),
    independentlyAttested:false,signature:null,executionEnabled:false};
}
