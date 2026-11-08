/**
 * NEO-GENIUS-009 — read-only evidence extraction for Counterparty issuer history.
 * Caller-supplied JSON is untrusted, even when it contains valid TXIDs.
 * Never use this module to sign, mint, lock, transfer, buy, or sell assets.
 */
import {createHash} from 'node:crypto';
const SHA=value=>createHash('sha256').update(value).digest('hex');
const ASSET=/^[A-Z][A-Z0-9.]{1,30}$/;
const TX=/^[a-f0-9]{64}$/i;
const quantityString=x=>typeof x==='string'?x:Number.isSafeInteger(x)&&x>=0?String(x):'';
function safeQuantity(x) {
  const s=quantityString(x);
  if(!/^(0|[1-9][0-9]*)$/.test(s)) throw new TypeError('Issuance quantity must be an integer base-unit string');
  const n=BigInt(s);
  if(n>10n**30n) throw new RangeError('Issuance quantity exceeds evidence bound');
  return n;
}
function endpoint(asset, sourceUrl) {
  try {
    const url=new URL(sourceUrl);
    if(url.protocol!=='https:' || url.username || url.password) return false;
    return url.pathname==='/v2/assets/'+asset+'/issuances'
      || url.pathname==='/api/issuances/'+asset;
  } catch {return false;}
}
function decodedRows(payload) {
  if(!payload || typeof payload!=='object' || Array.isArray(payload)) throw new TypeError('Counterparty JSON envelope required');
  const rows=payload.result ?? payload.data;
  if(!Array.isArray(rows)) throw new TypeError('Issuance array unavailable; API may be offline or incompatible');
  return rows;
}
/**
 * Extracts an audit CANDIDATE, never certifies on-chain acceptance or complete supply.
 * Complete API history requires independently corroborated page enumeration and node.
 */
export function analyzeIssuanceEvidence({asset,pages=[]}={}) {
  if(!ASSET.test(asset||'')) throw new TypeError('Invalid Counterparty asset');
  if(!Array.isArray(pages) || pages.length<1 || pages.length>50) throw new TypeError('1-50 attributed pages required');
  const problems=[],normalized=[],seen=new Set(),sourceEvidence=[];
  for(const [index,page] of pages.entries()) {
    if(!endpoint(asset,page?.sourceUrl)||typeof page.retrievedAt!=='string'||!Number.isFinite(Date.parse(page.retrievedAt)))
      throw new TypeError('HTTPS official-style issuance endpoint and retrieval timestamp required: page '+index);
    const rows=decodedRows(page.payload);
    if(rows.length>1000) throw new RangeError('Oversized page');
    sourceEvidence.push({sourceUrl:page.sourceUrl,retrievedAt:page.retrievedAt,
      serializedPayloadSha256:SHA(JSON.stringify(page.payload)),
      rawHttpResponseSha256:null,independentNode:false,
      paginationReportedComplete:page.paginationReportedComplete===true});
    for(const [j,rec] of rows.entries()) {
      if(!rec || typeof rec!=='object' || Array.isArray(rec)) throw new TypeError('Invalid issuance entry');
      const hash=String(rec.tx_hash??'').toLowerCase();
      const block=rec.block_index;
      if(rec.asset!==asset){problems.push('Asset mismatch on page '+index+', row '+j);continue;}
      if(!TX.test(hash)||!Number.isSafeInteger(block)||block<=0) {
        problems.push('Missing valid tx hash/block on page '+index+', row '+j);continue;
      }
      if(seen.has(hash)){problems.push('Repeated transaction hash '+hash);continue;}
      seen.add(hash);
      const quantity=safeQuantity(rec.quantity);
      const isValid=rec.status==='valid';
      const item={
        txHash:hash,blockIndex:block,quantityBaseUnits:quantity.toString(),
        issuer:typeof rec.issuer==='string'?rec.issuer:null,
        source:typeof rec.source==='string'?rec.source:null,
        isValid,
        lockObserved:rec.lock===true || rec.locked===true,
        transferObserved:rec.transfer===true,
        divisible:typeof rec.divisible==='boolean'?rec.divisible:null,
        sourceIndex:index
      };
      if(!isValid) problems.push('Not a valid issuance transaction: '+hash);
      normalized.push(item);
    }
  }
  const valid=normalized.filter(x=>x.isValid).sort((a,b)=>a.blockIndex-b.blockIndex||a.txHash.localeCompare(b.txHash));
  const tentativeQuantity=valid.filter(x=>!x.transferObserved).reduce((sum,x)=>sum+BigInt(x.quantityBaseUnits),0n);
  const issuerSet=new Set(valid.map(x=>x.issuer).filter(Boolean));
  const divisorSet=new Set(valid.map(x=>x.divisible).filter(x=>x!==null));
  if(divisorSet.size>1) problems.push('Contradictory divisibility in claimed issuance sequence');
  return Object.freeze({
    schema:'neo-genius-009/issuance-history-review-v1',
    asset,firstObservedIssuance:valid.length?{txHash:valid[0].txHash,blockIndex:valid[0].blockIndex}:null,
    reportedValidTransactions:valid.length,
    quantityFromSuppliedValidRowsBaseUnits:tentativeQuantity.toString(),
    anyLockEventObserved:valid.some(x=>x.lockObserved),
    anyIssuerTransferObserved:valid.some(x=>x.transferObserved),
    issuersReported:[...issuerSet],divisibleObserved:divisorSet.size===1?[...divisorSet][0]:null,
    transactions:valid,sourceEvidence,problems,
    status:problems.length?'PARTIAL-OR-CONFLICTING-RECORDS':'UNVERIFIED-API-EVIDENCE',
    completeHistoryVerified:false,
    bitcoinConfirmationsIndependentlyValidated:false,
    issuanceLockIndependentlyVerified:false,
    tokenSupplyIndependentlyVerified:false,
    legalIssuerOrShareholderRightsVerified:false,
    legalStablecoinOrSecuritiesComplianceVerified:false,
    governmentReserveEligible:false,
    disclaimer:'The apparent issuance rows and source JSON fingerprints are NOT an audited node proof, full issuance history, proof of issuer key control, corporate equity, reserve backing or regulator approval.'
  });
}
/** Returns read-only GET URLs; caller must handle throttling, pagination and failures. */
export function counterpartyIssuanceReadUrls(asset) {
  if(!ASSET.test(asset||'')) throw new TypeError('Invalid Counterparty asset');
  return Object.freeze([
    'https://api.counterparty.io:4000/v2/assets/'+asset+'/issuances',
    'https://www.tokenscan.io/api/issuances/'+asset
  ]);
}
