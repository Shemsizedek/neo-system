// NOMNI proposal gate: evidence checks only. Never issues tokens or asserts regulatory approval.
// NOMNI is currently a Bitcoin/Counterparty currency and unit of account.
const EVIDENCE = [
  'issuerIdentity', 'redemptionPolicy', 'counterpartySupplySnapshot',
  'segregatedReserveStatement', 'independentReserveAttestation',
  'legalIssuerAuthorization', 'complianceAndConsumerDisclosures',
  'governanceApproval',
];
const POSITIVE_DECIMAL = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

function units(value, decimals) {
  if (typeof value !== 'string' || !POSITIVE_DECIMAL.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals || whole.length > 50) return null;
  return BigInt(whole) * (10n ** BigInt(decimals))
    + BigInt(fraction.padEnd(decimals, '0') || '0');
}

/**
 * This function cannot approve stablecoin issuance or establish legal compliance.
 * Valid evidence presence is a preparation signal, not proof of truth.
 */
export function assessNomniStabilityProposal(proposal = {}) {
  if (!proposal || typeof proposal !== 'object' || Array.isArray(proposal)) {
    throw new TypeError('proposal must be an object');
  }
  const missing = [];
  if (proposal.asset !== 'NOMNI' || proposal.network !== 'bitcoin-counterparty') {
    missing.push('verifiedCounterpartyAsset');
  }
  // USD 1:1 is the approved research objective only; every submitted proposal must match. No active peg or redemption claim.
  if (proposal.peg?.currency !== 'USD' || proposal.peg?.usdPerNomni !== '1') {
    missing.push('approvedPegDefinition');
  }
  const supply = units(proposal.outstandingNomni, 8);
  if (supply === null) missing.push('outstandingSupplyVerification');
  const reserve = units(proposal.usdReserveValue, 2);
  if (reserve === null) missing.push('reserveValuationVerification');
  if (reserve !== null && supply !== null && reserve * 1000000n < supply) {
    missing.push('fullReserveCoverage');
  }
  for (const field of EVIDENCE) {
    if (typeof proposal.evidence?.[field] !== 'string' ||
        !/^[A-Za-z0-9][A-Za-z0-9_./:-]{7,250}$/.test(proposal.evidence[field])) {
      missing.push(field);
    }
  }
  return Object.freeze({
    asset: 'NOMNI',
    network: 'bitcoin-counterparty',
    currentDesignation: 'currency-and-unit-of-account',
    proposedDesignation: 'payment-stablecoin-review',
    readiness: missing.length ? 'blocked' : 'pending-independent-legal-and-reserve-verification',
    mayIssue: false,
    mayMarketAsStablecoin: false,
    mayPromiseRedemption: false,
    coinbaseAssetSupport: false,
    missing: Object.freeze(missing),
  });
}

export function assertNoPrematureNomniStablecoinClaim(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    throw new TypeError('metadata required');
  }
  const fields = [metadata.instrument_type, metadata.classification, metadata.description, metadata.status]
    .filter(v => typeof v === 'string').join(' ');
  if (/stable[ -]?coin|fully[ -]?backed|guaranteed[ -]?redeemable|usd[ -]?pegged|1\s*NOMNI\s*=\s*\$?1/i.test(fields)) {
    throw new Error('Stablecoin, backing, peg and redemption claims require independent approval');
  }
  return true;
}
