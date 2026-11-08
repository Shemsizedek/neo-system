/**
 * NEO-GENIUS-006: reconcile public marketing observations without inventing
 * audited NOI, title, fiat reserves, government endorsement or issuer authority.
 * READ ONLY. Caller-provided observations are NEVER trusted attestations.
 */
function integerUSD(value) {
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('USD input must be a nonnegative safe integer');
  return BigInt(value);
}
function sourceURL(value) {
  return typeof value === 'string' && /^https:\/\/[a-z0-9.-]+(?:\/|$)/i.test(value);
}
function decimalUSD(cents) {
  const sign = cents < 0n ? '-' : '';
  const n = cents < 0n ? -cents : cents;
  return sign + String(n / 100n) + '.' + String(n % 100n).padStart(2,'0');
}
const fields = ['supply','divisible','locked'];
export function reconcilePropertyMarketing(claims) {
  if(!Array.isArray(claims) || !claims.length) throw new TypeError('At least one dated source claim required');
  const observations = claims.map((claim, i) => {
    if(!sourceURL(claim?.url)) throw new TypeError('Invalid source URL at ' + i);
    if(typeof claim.observedAt !== 'string' || Number.isNaN(Date.parse(claim.observedAt))) throw new TypeError('Invalid observation timestamp at ' + i);
    const price = integerUSD(claim.askingPriceUsd);
    const cap = claim.capRateBasisPoints;
    if(cap !== null && cap !== undefined && (!Number.isSafeInteger(cap) || cap < 0 || cap > 10000)) throw new TypeError('Invalid cap rate basis points');
    const reportedNOI = claim.reportedNoiUsd === undefined || claim.reportedNoiUsd === null ? null : decimalUSD(integerUSD(claim.reportedNoiUsd)*100n);
    // price[USD] * cap[bps]/10000 => NOI[USD]; -> cents via /100.
    const impliedCorrected = cap === null || cap === undefined ? null : decimalUSD((price * 100n * BigInt(cap)) / 10000n);
    return Object.freeze({
      url:claim.url, observedAt:claim.observedAt, askingPriceUsd:claim.askingPriceUsd,
      statedCapRateBasisPoints:cap ?? null, reportedNoiUsd:reportedNOI,
      impliedNoiUsd:impliedCorrected, // mathematical implication, NEVER trailing NOI proof
      evidenceClass:'listing-claim', brokerVerified:false, auditedNOI:false,
    });
  });
  const askSet = new Set(observations.map(x=>x.askingPriceUsd));
  const capSet = new Set(observations.map(x=>x.statedCapRateBasisPoints).filter(x=>x!==null));
  const alerts=[];
  if(askSet.size>1) alerts.push('asking-prices-differ-across-observations');
  if(capSet.size>1) alerts.push('stated-cap-rates-differ-across-observations');
  if(observations.some(x=>x.reportedNoiUsd!==null)) alerts.push('seller-noi-must-be-reconciled-to-t12');
  return Object.freeze({
    schema:'neo-genius-006/market-claims-v1',
    observations, alerts,
    validatedNoi:false, verifiedPriceReduction:false, ownerAuthority:false, siteControl:false,
    status:'MARKETING-ONLY',
    note:'Cap-derived NOI is a mathematical implication of a marketing cap rate, not a verified trailing operating statement. Differing listings do not prove a repricing.'
  });
}
export function compareNomniExplorerObservations({project, independentExplorer}={}) {
  if (!project || !independentExplorer || !sourceURL(project.url) || !sourceURL(independentExplorer.url)) throw new TypeError('Two attributed URLs required');
  if(new URL(project.url).hostname === new URL(independentExplorer.url).hostname) throw new TypeError('Distinct publisher origins required');
  const agreements = {};
  for(const key of fields) {
    const a=project[key],b=independentExplorer[key];
    agreements[key] = a===undefined || b===undefined ? 'UNKNOWN' : a===b ? 'PUBLISHED-AGREEMENT' : 'CONFLICT';
  }
  return Object.freeze({
    schema:'neo-genius-006/asset-public-observations-v1',
    asset:'NOMNI',
    agreements,
    sourceUrls:[project.url,independentExplorer.url],
    sourceClass:'corroborated-explorer-reporting-only',
    independentlyValidatedByFullNode:false,
    genesisOrIssuanceTxConfirmed:false, ownershipVerified:false,
    reservesVerified:false, redemptionRightVerified:false,
    geniusActIssuerCertified:false, liquidityVerified:false,
    certification:'NOT-CERTIFIED'
  });
}
export function decideGate006({propertyPackets=[], issuerPacket={}, pilotEvidence={}}={}) {
  const requiredProperty=['ownerAuthority','siteControl','title','rentRoll','trailing12','insurance','taxHistory','flood','funding'];
  const requiredIssuer=['goodStanding','ownerConsent','signedResolution','capTable','rightsAgreement','assetTx','counselMemo'];
  const requiredPilot=['independentNodeSnapshot','custodianAuthority','balanceVarianceTest','securityReview','agencyScope','vendorCredentials'];
  const missing=(obj,keys)=>keys.filter(k=>!(obj?.[k]?.reviewerId && obj?.[k]?.authenticityReviewId && obj?.[k]?.sourceUrl && sourceURL(obj[k].sourceUrl)));
  // Intentionally *never* promote caller-provided documents to final approval:
  // real identities, signatures, legal rights, node evidence and contracts
  // require out-of-band verification by authorized reviewers.
  const property=propertyPackets.map(p=>({id:p.id||'unassigned',missing:missing(p.documents,requiredProperty),status:'EXTERNAL-APPROVAL-REQUIRED'}));
  return Object.freeze({
    schema:'neo-genius-006/release-decisions-v1',
    property,issuer:{missing:missing(issuerPacket,requiredIssuer),status:'LEGAL-REVIEW-REQUIRED'},
    government:{missing:missing(pilotEvidence,requiredPilot),status:'AGENCY-AND-SECURITY-REVIEW-REQUIRED'},
    acquisitionAuthorized:false, securitiesIssuanceAuthorized:false,
    governmentContractAwarded:false, grantApplicationReady:false, reserveCertified:false,
    status:'HOLD-BINDING-ACTIVITY'
  });
}
