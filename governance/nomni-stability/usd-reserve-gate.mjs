// Project 144: proposed USD-backed NOMNI model. This is not an issued or approved stablecoin.
// No blockchain calls, wallet access, fiat accounts, transfers, private issuer data or Coinbase access.
export const NOMNI_USD_TARGET = Object.freeze({
  asset: 'NOMNI',
  network: 'bitcoin-counterparty',
  targetRedemptionUsdPerNomni: '1.00',
  status: 'PROPOSED_NOT_LIVE',
  onchainAssetChangeAuthorized: false,
  issuanceAuthorized: false,
  redemptionAuthorized: false,
  marketingAuthorized: false,
  coinbaseNomniIntegrationAuthorized: false,
});

const REQUIRED_EVIDENCE = Object.freeze([
  'issuerAuthorization',
  'counterpartySupplyReconciliation',
  'preexistingHolderRightsReview',
  'reserveCustodianVerification',
  'reserveSegregationVerification',
  'independentReserveAttestation',
  'redemptionRightsAndTimetable',
  'financialComplianceReview',
  'governanceReleaseApproval',
]);
const DECIMAL = /^(0|[1-9]\d*)(?:\.(\d+))?$/;
const ALLOWED_KEYS = new Set([
  'asset', 'network', 'targetRedemptionUsdPerNomni',
  'reportedOutstandingNomni', 'reportedSegregatedUsdCash', 'reportedDivisible',
  'supplyAsOfUtc', 'reserveAsOfUtc', 'evidenceRefs',
]);

function scaled(value, precision) {
  if (typeof value !== 'string' || value.length > 75) return null;
  const match = DECIMAL.exec(value);
  if (!match || (match[2] || '').length > precision || match[1].length > 45) return null;
  return BigInt(match[1]) * 10n ** BigInt(precision) +
    BigInt((match[2] || '').padEnd(precision, '0') || '0');
}

function verifiedTimestamp(value, nowEpoch, maxAgeMs) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(value)) return false;
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value.slice(0, -1) + '.000Z') return false;
  return parsed <= nowEpoch && nowEpoch - parsed <= maxAgeMs;
}

/**
 * Safely compute an illustrative reserve gap for ALL reported outstanding NOMNI.
 * USD cash figures are SELF-REPORTED and are not proof of custody, eligibility or legal rights.
 * 'evidenceRefs' values must refer to independently reviewable, privately held material.
 * Even complete self-reported evidence never authorizes issuance, redemptions or a public peg claim.
 */
export function assessNomniUsdBacking(snapshot = {}, {
  nowUtc = new Date().toISOString(),
  maxSnapshotAgeHours = 24,
} = {}) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    throw new TypeError('Reserve snapshot must be a plain object');
  }
  if (Object.keys(snapshot).some(key => !ALLOWED_KEYS.has(key))) {
    throw new Error('Unapproved snapshot fields; never submit customer data, credentials, or account numbers');
  }
  if (!Number.isInteger(maxSnapshotAgeHours) || maxSnapshotAgeHours < 1 || maxSnapshotAgeHours > 720) {
    throw new RangeError('Invalid maximum snapshot age');
  }
  const nowEpoch = Date.parse(nowUtc);
  if (!Number.isFinite(nowEpoch)) throw new TypeError('Valid nowUtc required');
  const missing = [];
  if (snapshot.asset !== 'NOMNI' || snapshot.network !== 'bitcoin-counterparty') {
    missing.push('nativeCounterpartyNOMNIProvenance');
  }
  if (snapshot.targetRedemptionUsdPerNomni !== '1.00') {
    missing.push('usdOneToOneProposalMatch');
  }
  if (snapshot.reportedDivisible !== false) missing.push('verifyNomniIsIndivisibleOnCounterparty');
  const outstanding = scaled(snapshot.reportedOutstandingNomni, 8);
  if (outstanding !== null && outstanding % 100000000n !== 0n) {
    missing.push('indivisibleAssetSupplyConflict');
  }
  const cash = scaled(snapshot.reportedSegregatedUsdCash, 2);
  if (outstanding === null || outstanding === 0n) missing.push('completeOutstandingNomniSupply');
  if (cash === null) missing.push('segregatedUsdCashStatement');
  const ageMs = maxSnapshotAgeHours * 3600000;
  if (!verifiedTimestamp(snapshot.supplyAsOfUtc, nowEpoch, ageMs)) missing.push('freshCounterpartySupplySnapshot');
  if (!verifiedTimestamp(snapshot.reserveAsOfUtc, nowEpoch, ageMs)) missing.push('freshReserveSnapshot');
  for (const key of REQUIRED_EVIDENCE) {
    const ref = snapshot.evidenceRefs?.[key];
    if (typeof ref !== 'string' || !/^evidence:[A-Za-z0-9_/-]{8,80}$/.test(ref)) {
      missing.push(key);
    }
  }
  // 1 NOMNI = 100,000,000 protocol-scale units. $1 = 100 cents.
  // Ceil at one cent rather than under-reserve fractional liabilities.
  const requiredCents = outstanding === null ? null : (outstanding + 999999n) / 1000000n;
  const apparentShortfallCents =
    requiredCents === null || cash === null ? null :
    (requiredCents > cash ? requiredCents - cash : 0n);
  if (apparentShortfallCents !== null && apparentShortfallCents > 0n) {
    missing.push('reportedOneToOneReserveCoverage');
  }

  return Object.freeze({
    ...NOMNI_USD_TARGET,
    readiness: missing.length ? 'BLOCKED' : 'PENDING_INDEPENDENT_VERIFICATION',
    reportedRequiredReserveCents: requiredCents === null ? null : requiredCents.toString(),
    reportedCashReserveCents: cash === null ? null : cash.toString(),
    reportedShortfallCents: apparentShortfallCents === null ? null : apparentShortfallCents.toString(),
    reserveEvidenceVerified: false,
    issuerAuthorizationVerified: false,
    existingHolderRightsVerified: false,
    missing: Object.freeze(missing),
  });
}
