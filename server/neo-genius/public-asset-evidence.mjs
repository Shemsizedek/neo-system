/**
 * NEO-GENIUS-008 — safe consolidation of read-only public Counterparty balance observations.
 * Untrusted API fields are observations, NOT proof of custody, issuance history, legal title,
 * securities rights, registered issuer status, or independently audited reserves.
 */
const FIELDS = new Set(['address','asset','quantity','issuer','owner','divisible','locked','status','source']);
const namePattern = /^[A-Z][A-Z0-9.]{1,30}$/;
const addressPattern = /^(?:[13][a-km-zA-HJ-NP-Z1-9]{24,35}|bc1[a-z0-9]{11,87})$/;
const QUANTITY_MAX = 10n ** 30n;

function integerQuantity(q) {
  if(typeof q !== 'string' || !/^(0|[1-9][0-9]*)$/.test(q)) throw new TypeError('Quantity must be a decimal integer string');
  const n = BigInt(q);
  if(n > QUANTITY_MAX) throw new RangeError('Quantity exceeds observation bound');
  return n;
}
function safeFields(record) {
  if(!record || Array.isArray(record) || typeof record !== 'object') throw new TypeError('Observation must be an object');
  for(const field of Object.keys(record)) if(!FIELDS.has(field)) throw new TypeError('Unsupported or sensitive field: ' + field);
}
function normalize(record) {
  safeFields(record);
  if(!namePattern.test(record.asset || '')) throw new TypeError('Invalid asset');
  if(!addressPattern.test(record.address || '')) throw new TypeError('Invalid public Bitcoin address');
  if(!addressPattern.test(record.issuer || '') || !addressPattern.test(record.owner || '')) throw new TypeError('Invalid on-chain issuer/owner field');
  if(record.status !== 'live' || record.source !== 'CounterPay public wallet balance') throw new TypeError('Unsupported or unavailable evidence source');
  if(typeof record.divisible !== 'boolean' || typeof record.locked !== 'boolean') throw new TypeError('Missing token flags');
  return Object.freeze({...record,quantity:integerQuantity(record.quantity).toString()});
}
/** Never interprets wallet aggregate as total circulating or issued supply. */
export function summarizePublicAssetObservations(records) {
  if(!Array.isArray(records) || records.length < 1 || records.length > 200) throw new TypeError('Expected 1 to 200 observations');
  const ids = new Set();
  const groups = new Map();
  for(const input of records){
    const row=normalize(input);
    const id=row.address + ':' + row.asset;
    if(ids.has(id)) throw new Error('Duplicate public wallet/asset observation: ' + id);
    ids.add(id);
    if(!groups.has(row.asset)) groups.set(row.asset,[]);
    groups.get(row.asset).push(row);
  }
  const assets=[...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([asset,items])=>{
    const owner=new Set(items.map(x=>x.owner)),issuer=new Set(items.map(x=>x.issuer));
    const divisibility=new Set(items.map(x=>x.divisible)),locked=new Set(items.map(x=>x.locked));
    const conflicts=owner.size>1 || issuer.size>1 || divisibility.size>1 || locked.size>1;
    const quantity=items.reduce((sum,item)=>sum+BigInt(item.quantity),0n);
    return Object.freeze({
      asset, reportedHoldingsInObservedWallets:quantity.toString(),
      walletCount:items.length,
      reportedIssuer:issuer.size===1?items[0].issuer:null,
      reportedAssetOwner:owner.size===1?items[0].owner:null,
      divisible:divisibility.size===1?items[0].divisible:null,
      issuanceLocked:locked.size===1?items[0].locked:null,
      conflictingMetadata:conflicts,
      circulatingSupplyVerified:false,
      tokenIssuanceTransactionVerified:false,
      privateKeyControlVerified:false,
      economicOrShareholderRightsVerified:false,
      priceOrLiquidityVerified:false,
      reservesOrRedemptionVerified:false,
      regulatorOrGovernmentApprovalVerified:false,
      securityOfferingAuthorized:false,
      certification:conflicts?'METADATA-CONFLICT':'PUBLIC-API-OBSERVATION-ONLY'
    });
  });
  return Object.freeze({
    schema:'neo-genius-008/public-asset-observations-v1',
    source:'CounterPay public wallet balance',
    status:'NONCUSTODIAL-OBSERVATION-NOT-ATTESTATION',
    assets,actualMainnetTxidProof:false,independentlyAudited:false,
    disclaimer:'A wallet balance is not the total token supply, cash reserves, an issuer signature, legally enforceable equity, an audited market price or authorization to offer securities.'
  });
}
