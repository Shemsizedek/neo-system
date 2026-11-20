/**
 * NEO-GENIUS-010 — counterparty issuance review, no trust in API responses.
 * Supports Counterparty v2 raw base-unit quantities and TokenScan human-unit
 * decimal quantities, which are NOT interchangeable.
 *
 * A parsed transaction or "locked" API field is not independent Bitcoin or
 * Counterparty node confirmation, a legal share, a fiat reserve, or ownership.
 * NO network requests, wallet access, signing or trades occur in this module.
 */
import {createHash} from 'node:crypto';
const SHA=v=>createHash('sha256').update(v).digest('hex');
const ASSET=/^[A-Z][A-Z0-9.]{1,30}$/;
const TX=/^[a-f0-9]{64}$/i;
const MAX=10n**30n;
function endpoint(asset,raw) {
  try {
    const u=new URL(raw);
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash) return null;
    if(u.hostname==='api.counterparty.io' && u.port==='4000'
      && u.pathname==='/v2/assets/'+asset+'/issuances') return 'counterparty-v2';
    const tokenScanPath='/api/issuances/'+asset;
    const remaining=u.pathname.startsWith(tokenScanPath)?u.pathname.slice(tokenScanPath.length):null;
    if(u.hostname==='tokenscan.io' && !u.port && remaining!==null
      && (remaining===''||/^\/[1-9][0-9]*\/[1-9][0-9]*$/.test(remaining))) return 'tokenscan';
    return null;
  }catch{return null;}
}
function exactBaseUnits(raw,source,divisible) {
  if(typeof divisible!=='boolean') throw new TypeError('Issuance divisibility metadata required');
  const value=typeof raw==='string'?raw:(Number.isSafeInteger(raw)&&raw>=0?String(raw):'');
  if(source==='counterparty-v2') {
    if(!/^(0|[1-9][0-9]*)$/.test(value))throw new TypeError('Counterparty v2 quantity must be an integer base-unit string');
    const n=BigInt(value);
    if(n>MAX)throw new RangeError('Quantity exceeds evidence bound');
    return n;
  }
  if(!/^(0|[1-9][0-9]*)(?:\.[0-9]{1,8})?$/.test(value))throw new TypeError('TokenScan quantity must be valid decimal human units');
  const [whole,frac='']=value.split('.');
  if(!divisible && frac.replace(/0/g,'')!=='')throw new TypeError('Indivisible TokenScan quantity cannot have fractional units');
  const n=divisible?BigInt(whole)*100000000n + BigInt(frac.padEnd(8,'0')):BigInt(whole);
  if(n>MAX)throw new RangeError('Quantity exceeds evidence bound');
  return n;
}
function decodedRows(payload,provider) {
  if(!payload||typeof payload!=='object'||Array.isArray(payload))throw new TypeError('Counterparty JSON envelope required');
  const rows=provider==='counterparty-v2'?payload.result:payload.data;
  if(!Array.isArray(rows))throw new TypeError('Issuance array unavailable; API may be offline or incompatible');
  return rows;
}
export function analyzeIssuanceEvidence({asset,pages=[]}={}) {
  if(!ASSET.test(asset||''))throw new TypeError('Invalid Counterparty asset');
  if(!Array.isArray(pages)||pages.length===0||pages.length>50)throw new TypeError('1-50 attributed pages required');
  const problems=[],normalized=[],seen=new Set(),sourceEvidence=[];
  for(const [index,page] of pages.entries()){
    const provider=endpoint(asset,page?.sourceUrl);
    if(!provider||typeof page.retrievedAt!=='string'||!Number.isFinite(Date.parse(page.retrievedAt)))
      throw new TypeError('HTTPS allowlisted issuance endpoint and valid retrieval timestamp required: page '+index);
    const rows=decodedRows(page.payload,provider);
    if(rows.length>1000)throw new RangeError('Oversized page');
    const reportedTotal=provider==='tokenscan' && Number.isSafeInteger(page.payload.total) && page.payload.total>=0
      ?page.payload.total:null;
    sourceEvidence.push({
      sourceUrl:page.sourceUrl,provider,retrievedAt:page.retrievedAt,
      serializedPayloadSha256:SHA(JSON.stringify(page.payload)),
      rawHttpResponseSha256:null,independentNode:false,
      reportedTotal,paginationReportedComplete:page.paginationReportedComplete===true
    });
    for(const [j,rec] of rows.entries()){
      if(!rec||typeof rec!=='object'||Array.isArray(rec))throw new TypeError('Invalid issuance entry');
      const hash=String(rec.tx_hash??'').toLowerCase(),block=rec.block_index;
      if(rec.asset!==asset){problems.push('Asset mismatch on page '+index+', row '+j);continue;}
      if(!TX.test(hash)||!Number.isSafeInteger(block)||block<=0){
        problems.push('Missing valid tx hash/block on page '+index+', row '+j);continue;
      }
      if(seen.has(hash)){problems.push('Repeated transaction hash '+hash);continue;}
      seen.add(hash);
      const quantity=exactBaseUnits(rec.quantity,provider,rec.divisible);
      const valid=rec.status==='valid';
      const row={txHash:hash,blockIndex:block,quantityBaseUnits:quantity.toString(),
        quantityEncoding:provider==='tokenscan'?'human-units-decimal':'base-units-integer',
        issuer:typeof rec.issuer==='string'?rec.issuer:null,
        source:typeof rec.source==='string'?rec.source:null,
        isValid:valid,lockFlagReported:rec.lock===true||rec.locked===true,
        transferObserved:rec.transfer===true,divisible:rec.divisible,sourceIndex:index};
      if(!valid)problems.push('Not a valid issuance transaction: '+hash);
      normalized.push(row);
    }
  }
  const valid=normalized.filter(r=>r.isValid).sort((a,b)=>a.blockIndex-b.blockIndex||a.txHash.localeCompare(b.txHash));
  const sampleSum=valid.filter(r=>!r.transferObserved).reduce((a,r)=>a+BigInt(r.quantityBaseUnits),0n);
  const divisibilities=new Set(valid.map(r=>r.divisible));
  if(divisibilities.size>1)problems.push('Contradictory divisibility in claimed issuance sequence');
  const first=valid.length?{txHash:valid[0].txHash,blockIndex:valid[0].blockIndex}:null;
  return Object.freeze({
    schema:'neo-genius-010/issuance-history-review-v2',
    asset,firstObservedIssuance:first,
    reportedValidTransactions:valid.length,
    quantityFromSuppliedValidRowsBaseUnits:sampleSum.toString(),
    // The API "locked" field reports an asset property, not a confirmed
    // issuance-lock EVENT transaction with independently checked Bitcoin block.
    anyLockFieldReported:valid.some(r=>r.lockFlagReported),
    anyLockEventObserved:false,
    anyIssuerTransferObserved:valid.some(r=>r.transferObserved),
    issuersReported:[...new Set(valid.map(r=>r.issuer).filter(Boolean))],
    divisibleObserved:divisibilities.size===1?[...divisibilities][0]:null,
    transactions:valid,sourceEvidence,problems,
    status:problems.length?'PARTIAL-OR-CONFLICTING-RECORDS':'UNVERIFIED-API-EVIDENCE',
    completeHistoryVerified:false,
    bitcoinConfirmationsIndependentlyValidated:false,
    issuanceLockIndependentlyVerified:false,
    tokenSupplyIndependentlyVerified:false,
    legalIssuerOrShareholderRightsVerified:false,
    legalStablecoinOrSecuritiesComplianceVerified:false,
    governmentReserveEligible:false,
    disclaimer:'Read-only published API rows only; no proof of full issuance history, no independently confirmed Bitcoin TXID/block, no current key control, no legal title or government reserve eligibility.'
  });
}
export function counterpartyIssuanceReadUrls(asset) {
  if(!ASSET.test(asset||''))throw new TypeError('Invalid Counterparty asset');
  return Object.freeze([
    'https://api.counterparty.io:4000/v2/assets/'+asset+'/issuances',
    'https://tokenscan.io/api/issuances/'+asset
  ]);
}
