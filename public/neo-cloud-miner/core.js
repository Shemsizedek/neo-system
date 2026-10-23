export const RELEASE = Object.freeze({version:'0.1.0-preview',mode:'PRELAUNCH_READ_ONLY',purchasesEnabled:false,tokenIssuanceEnabled:false});
export const RAILS = Object.freeze(['BTC','XCP','NOMNI','USD']);
export const STORAGE_KEY = 'neo.cloud-miner.drafts.v1';
export const MAX_DRAFTS = 25;

export function validatePlan(input = {}) {
  const hashrateTh = Number(input.hashrateTh);
  const termDays = Number(input.termDays);
  const requestedRail = String(input.requestedRail || '').toUpperCase();
  const assetReference = String(input.assetReference || '').trim();
  if (!Number.isSafeInteger(hashrateTh) || hashrateTh < 1 || hashrateTh > 100000) throw new Error('Choose a whole-number hashrate between 1 and 100,000 TH/s.');
  if (![30,90,180,365].includes(termDays)) throw new Error('Choose a supported duration.');
  if (!RAILS.includes(requestedRail)) throw new Error('Choose a supported payment preference.');
  if (assetReference && !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(assetReference)) throw new Error('Use a public asset ID only: up to 64 letters, numbers, dots, dashes or underscores.');
  return {hashrateTh,termDays,requestedRail,assetReference:assetReference || null};
}

export function createDraft(input, {id, now = new Date().toISOString()} = {}) {
  if (typeof id !== 'string' || !/^PLAN-[a-zA-Z0-9-]{8,64}$/.test(id)) throw new Error('A valid local plan identifier is required.');
  if (typeof now !== 'string' || !Number.isFinite(Date.parse(now))) throw new Error('A valid creation time is required.');
  return {schemaVersion:1,id,state:'LOCAL_DRAFT',createdAt:now,...validatePlan(input),network:'UNASSIGNED',providerAllocationId:null,quoteId:null,amountDue:null,paymentVerified:false,miningVerified:false,tokenIssued:false};
}

export function parseDrafts(raw) {
  if (raw === null || raw === undefined || raw === '') return [];
  if (typeof raw !== 'string' || raw.length > 100000) throw new Error('Local plan storage is invalid.');
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows) || rows.length > MAX_DRAFTS) throw new Error('Local plan storage is invalid.');
  const seen = new Set();
  return rows.map(row => {
    if (!row || row.state !== 'LOCAL_DRAFT' || seen.has(row.id)) throw new Error('Local plan storage is invalid.');
    seen.add(row.id);
    // Rebuild the allowlisted record: storage cannot elevate a draft to paid/live.
    return createDraft(row,{id:row.id,now:row.createdAt});
  });
}

export function isFreshEvidence(record, nowMs = Date.now(), maxAgeMs = 60000) {
  if (!record || !Number.isFinite(nowMs) || !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) return false;
  const observed = Date.parse(record.observedAt);
  return typeof record.observedAt === 'string' && Number.isFinite(observed) && observed <= nowMs && nowMs - observed <= maxAgeMs;
}

export function assessMiningEvidence(record, nowMs = Date.now()) {
  if (!record || record.network !== 'mainnet' || record.simulation !== false || !isFreshEvidence(record,nowMs)) return {verified:false,reason:'MAINNET_FRESH_INDEPENDENT_EVIDENCE_REQUIRED'};
  if (record.source !== 'AUTHENTICATED_POOL_ADAPTER' || record.signatureVerified !== true || typeof record.allocationId !== 'string' || !record.allocationId) return {verified:false,reason:'INDEPENDENT_POOL_ATTESTATION_REQUIRED'};
  if (!Number.isSafeInteger(record.acceptedShares) || record.acceptedShares <= 0) return {verified:false,reason:'ACCEPTED_SHARE_EVIDENCE_REQUIRED'};
  // A trusted backend must establish these fields. Browser data is never authorization.
  return {verified:true,reason:'POOL_WORK_REPORTED',acceptedShares:record.acceptedShares,btcReceived:null,tokenIssuanceAuthorized:false};
}

export function createCounterCheckoutUrl(order, base = 'https://shemsizedek.github.io/neo-system/neo-counter/') {
  // Adapter for a future server-authorized order. Never an activation or settlement proof.
  if (!order || typeof order.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(order.id)) throw new Error('SERVER_ORDER_REQUIRED');
  if (!Number.isSafeInteger(order.amountCents) || order.amountCents <= 0 || order.amountCents > 100000000) throw new Error('SERVER_AMOUNT_REQUIRED');
  if (!RAILS.includes(order.rail)) throw new Error('PAYMENT_RAIL_INVALID');
  const url = new URL(base);
  if (url.origin !== 'https://shemsizedek.github.io' || url.pathname !== '/neo-system/neo-counter/' || url.username || url.password || url.search || url.hash) throw new Error('CHECKOUT_ORIGIN_NOT_APPROVED');
  url.search = new URLSearchParams({checkout:'1',amount:String(order.amountCents),service:'neo-miner',order:order.id,label:'NEO cloud mining contract',rail:order.rail}).toString();
  return url.toString();
}

export function canActivateFromBrowser() { return false; }
export function canIssueTokenFromShares() { return false; }
