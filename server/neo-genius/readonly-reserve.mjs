/**
 * NEO-GENIUS-003: read-only, proof-aware digital asset reporting primitives.
 * No wallet keys, transaction creation, issuance, sales, or custody.
 * This module does not assert legal compliance or independent audit.
 */
import {createHash} from 'node:crypto';

const SENSITIVE = /(?:private[_-]?key|seed[_-]?phrase|mnemonic|\bwif\b|\bxprv\b|password|api[_-]?secret)/i;
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
function rejectSecrets(value, path = 'input') {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE.test(key)) throw new Error('Sensitive field is prohibited at ' + path + '.' + key);
    rejectSecrets(item, path + '.' + key);
  }
}
function positiveIntegerLike(x) { return typeof x === 'string' && /^\d+$/.test(x) || Number.isSafeInteger(x) && x >= 0; }
function normalizedSats(s) {
  if (!positiveIntegerLike(s)) throw new Error('confirmedSats must be a nonnegative integer (string preferred)');
  return BigInt(s);
}
function isFixture(x) {return x?.evidenceClass === 'fixture' || x?.evidenceClass === 'operator-assertion';}
function boundedText(value, max=500) {return String(value || '').slice(0,max);}
export function assessBitcoinReserve({walletSnapshots = [], priceQuote = null, custodianStatement = null} = {}) {
  rejectSecrets({walletSnapshots,priceQuote,custodianStatement});
  if (!Array.isArray(walletSnapshots)) throw new Error('walletSnapshots must be an array');
  const warnings=[]; let sats=0n, isUsable=walletSnapshots.length>0;
  const heights = new Set();
  const items=walletSnapshots.map((snapshot, index)=>{
    if (typeof snapshot?.address !== 'string' || !/^[a-zA-Z0-9]{25,90}$/.test(snapshot.address)) throw new Error('Invalid wallet address at ' + index);
    const confirmed = normalizedSats(snapshot.confirmedSats);
    const source = snapshot.source || {};
    const provenance = typeof source.url === 'string' && /^https:\/\//.test(source.url) && typeof source.retrievedAt === 'string' && !Number.isNaN(Date.parse(source.retrievedAt));
    const heightOK = Number.isSafeInteger(source.blockHeight) && source.blockHeight > 0;
    if (heightOK) heights.add(source.blockHeight);
    if (!provenance || !heightOK || isFixture(source)) {isUsable=false;warnings.push('Address ' + (index+1) + ' lacks primary-source quality evidence');}
    sats += confirmed;
    return {address:snapshot.address, confirmedSats:confirmed.toString(), sourceClass:boundedText(source.evidenceClass,40), sourceUrl:boundedText(source.url), retrievedAt:boundedText(source.retrievedAt,50), blockHeight:heightOK?source.blockHeight:null, evidenceHash:sha256(JSON.stringify({address:snapshot.address,confirmedSats:confirmed.toString(),source}))};
  });
  if (heights.size>1){isUsable=false;warnings.push('Wallet snapshots do not share a common Bitcoin block height');}
  if(!walletSnapshots.length) warnings.push('No wallet snapshot evidence supplied');
  let price=null;
  if (priceQuote) {
    const amount=Number(priceQuote.usdPerBtc);
    if(Number.isFinite(amount) && amount>0 && priceQuote.method==='market-observed' && priceQuote.evidenceClass==='third-party-observation' && /^https:\/\//.test(priceQuote.sourceUrl||'') && !Number.isNaN(Date.parse(priceQuote.observedAt||''))) {
      price={usdPerBtc:amount, observedAt:priceQuote.observedAt, sourceUrl:priceQuote.sourceUrl, priceStatus:'indicative-unattested'};
    } else warnings.push('Price omitted: fallback, fixture or incomplete quotation is not acceptable');
  }
  let reconciled = null;
  if(custodianStatement){
    const statementSats = normalizedSats(custodianStatement.confirmedSats);
    const delta = sats - statementSats;
    reconciled={custodianSats:statementSats.toString(), differenceSats:delta.toString(), status:delta===0n ? 'input-matched-not-audited' : 'variance-open'};
    if(delta!==0n) warnings.push('Balance variance requires third-party reconciliation');
    if(isFixture(custodianStatement) || !custodianStatement.authenticated) warnings.push('Custodian statement is not authenticated');
  }
  const amountBTC = String(sats/100000000n) + '.' + (sats%100000000n).toString().padStart(8,'0');
  return {
    schema:'neo-genius-003/reserve-proof-v1',
    status:isUsable?'source-documented-not-independently-audited':'insufficient-source-evidence',
    asOfHeight:heights.size===1?[...heights][0]:null,
    totalConfirmedSats:sats.toString(),
    totalBTC:amountBTC,
    valuationUsdIndicative:price?Number(amountBTC)*price.usdPerBtc:null,
    price, walletEvidence:items, custodianReconciliation:reconciled, warnings,
    certification:{chainIndependentlyValidated:false, governmentCustodyVerified:false, legalStablecoinCompliance:false, reserveAttested:false},
    disclosure:'Read-only operator-supplied evidence report. No independent blockchain audit, reserve rights verification, government approval, or redemption guarantee.'
  };
}
/** An API observation is not a blockchain attestation. Persist the raw digest for future node corroboration. */
export async function collectCounterpartyObservation(asset, {fetchImpl=fetch, now=()=>new Date().toISOString()}={}) {
  if(!/^[A-Z][A-Z0-9.]{1,30}$/.test(asset)) throw new Error('Invalid Counterparty asset identifier');
  const base='https://api.counterparty.io:4000/v2/assets/';
  const endpoints=[base+encodeURIComponent(asset),base+encodeURIComponent(asset)+'/issuances'];
  const observations=[];
  for(const url of endpoints){
    try {
      const response=await fetchImpl(url,{method:'GET',headers:{accept:'application/json'},signal:AbortSignal.timeout(10000)});
      if(!response.ok) throw new Error('HTTP ' + response.status);
      const body=await response.text();
      const data=JSON.parse(body);
      observations.push({url,observedAt:now(),httpStatus:response.status,rawSha256:sha256(body),rawData:data});
    } catch(error){observations.push({url,observedAt:now(),error:String(error?.message||error).slice(0,140)});}
  }
  return {schema:'neo-genius-003/counterparty-observation-v1',asset,classification:'api-observation-not-independent-attestation',observations,verified:false};
}
