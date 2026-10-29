import { readFileSync } from 'node:fs';

export const COUNTERPARTY_MAX_RAW = 9223372036854775807n;
const policyUrl = new URL('../../registry/partners/cherokee-trinity-counterparty.json', import.meta.url);
const symbols = ['HALI', 'TSDU', 'WAYA'];

export function readRetokenizationPolicy() {
  return JSON.parse(readFileSync(policyUrl, 'utf8'));
}

export function decimalToRaw(value, precision) {
  if (![4, 8].includes(precision) || typeof value !== 'string' || !/^\d{1,20}(\.\d+)?$/.test(value)) throw new Error('exact_decimal_string_required');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > precision) throw new Error('quantity_precision_exceeded');
  return BigInt(whole) * 10n ** BigInt(precision) + BigInt(fraction.padEnd(precision, '0'));
}

function validatePolicy(policy) {
  const fail = () => { throw new Error('invalid_retokenization_policy'); };
  const target = policy?.destination;
  if (policy?.schema !== 'neo.retokenization.policy.v1' || policy.partner !== 'cherokee-trinity' || policy.direction !== 'XPR_TO_BITCOIN_COUNTERPARTY') fail();
  if (target?.blockchain !== 'bitcoin' || target.protocol !== 'counterparty' || target.network !== 'mainnet' || target.divisible !== true || target.protocolPrecision !== 8 || target.migrationClaimPrecision !== 4) fail();
  if (policy.unitMapping?.sourceUnits !== '1' || policy.unitMapping.targetUnits !== '1' || policy.unitMapping.status !== 'PROPOSED_REQUIRES_ISSUER_APPROVAL') fail();
  if (policy.sourceTreatment !== 'RETIRE_BEFORE_TARGET_ISSUANCE_PROPOSAL' || policy.sourceRetirementMechanism !== null || policy.issuerBitcoinAddress !== null || policy.issuerAuthorityVerified !== false || policy.sourceSnapshotVerified !== false) fail();
  const operations = ['compose', 'sign', 'broadcast', 'issue', 'sourceRetirement', 'assetSupplyLock'];
  if (!policy.execution || Object.keys(policy.execution).length !== operations.length || operations.some(key => policy.execution[key] !== false)) fail();
  if (!Array.isArray(policy.assets) || policy.assets.length !== 3 || new Set(policy.assets.map(row => row.sourceSymbol)).size !== 3) fail();
  for (const row of policy.assets) if (!symbols.includes(row.sourceSymbol) || row.preferredTargetAsset !== row.sourceSymbol) fail();
  return policy;
}

export function buildRetokenizationPlan(reference, policy = readRetokenizationPolicy()) {
  validatePolicy(policy);
  if (reference?.id !== 'cherokee-trinity' || reference.network?.namespace !== 'xpr-network' || !Array.isArray(reference.tokens) || reference.tokens.length !== 3 || !/^[a-f0-9]{40}$/.test(reference.source?.commit)) throw new Error('partner_reference_required');
  return {
    schema: 'neo.retokenization.plan.v1',
    partner: policy.partner,
    direction: policy.direction,
    state: 'DRAFT_NOT_EXECUTABLE',
    destination: structuredClone(policy.destination),
    unitMapping: structuredClone(policy.unitMapping),
    sourceTreatment: policy.sourceTreatment,
    issuerBitcoinAddress: null,
    assets: policy.assets.map(mapping => {
      const token = reference.tokens.find(row => row.symbol === mapping.sourceSymbol);
      if (!token || token.precision !== 4) throw new Error('source_precision_mismatch');
      const sourceRaw = decimalToRaw(token.declaredSupply, 4);
      const targetRaw = sourceRaw * 10000n;
      if (targetRaw <= 0n || targetRaw > COUNTERPARTY_MAX_RAW) throw new Error('counterparty_supply_limit_exceeded');
      return {
        sourceAssetId: `xpr-network:${token.contract}:${token.symbol}`,
        source: { ...structuredClone(token), repository: reference.source.repository, commit: reference.source.commit, verificationStatus: 'PARTNER_DECLARED' },
        target: {
          preferredAsset: mapping.preferredTargetAsset,
          assetId: `bitcoin:counterparty:mainnet:${mapping.preferredTargetAsset}`,
          assetNameStatus: 'REQUIRES_LIVE_PREFLIGHT_AND_OWNER_VERIFICATION',
          divisible: true,
          protocolPrecision: 8,
          declaredMaximumRawUnits: targetRaw.toString(),
          initialIssuanceRawUnits: '0',
          issuanceVerified: false
        },
        newAssetReservationTemplate: {
          state: 'DRAFT_NEW_ASSET_ONLY',
          method: 'GET',
          pathTemplate: '/v2/addresses/{verifiedIssuerBitcoinAddress}/compose/issuance',
          parameters: { asset: mapping.preferredTargetAsset, quantity: '0', divisible: true, description: null, lock: false, reset: false, transfer_destination: null },
          conditions: ['NAME_UNREGISTERED_AT_SIGNING', 'ISSUER_MANDATE_VERIFIED', 'METADATA_APPROVED', 'LIVE_FEE_BUDGET_APPROVED'],
          executable: false
        }
      };
    }),
    requiredEvidence: [
      'Issuer authorization and proof of control of the selected Bitcoin issuance address; existing assets require proof of their current owner.',
      'Verified XPR contract, issuer, supply and holder snapshot at an agreed irreversible block, including treasury, locked and staked balances.',
      'Approved source retirement or disablement mechanism and a source-to-target account-ownership proof for every claim.',
      'Durable unique claim ledger, duplicate/reorg handling, independent reconciliation and a regtest or testnet issuance rehearsal.',
      'Approved metadata and holder rights; governance, staking and automatic transfer-burn mechanics require separate implementation and review.',
      'Current asset-name, network-readiness, issuer-balance and fee checks followed by explicit issuance approval.'
    ],
    execution: structuredClone(policy.execution)
  };
}

// Arithmetic review of submitted figures, never proof of retirement or permission to issue.
export function reconcileRetokenization(reference, { symbol, retiredSourceQuantity, remainingSourceQuantity, issuedTargetQuantity } = {}) {
  const plan = buildRetokenizationPlan(reference);
  const asset = plan.assets.find(row => row.source.symbol === symbol);
  if (!asset) throw new Error('unknown_partner_token');
  const retired = decimalToRaw(retiredSourceQuantity, 4);
  const remaining = decimalToRaw(remainingSourceQuantity, 4);
  const issued = decimalToRaw(issuedTargetQuantity, 8);
  const maximum = BigInt(asset.target.declaredMaximumRawUnits);
  if (issued > COUNTERPARTY_MAX_RAW) throw new Error('counterparty_supply_limit_exceeded');
  const issues = [];
  if (issued % 10000n !== 0n) issues.push('TARGET_ISSUANCE_EXCEEDS_SOURCE_CLAIM_PRECISION');
  if (issued > retired * 10000n) issues.push('TARGET_ISSUANCE_EXCEEDS_REPORTED_SOURCE_RETIREMENT');
  if ((retired + remaining) * 10000n > maximum) issues.push('REPORTED_SOURCE_TOTAL_EXCEEDS_DECLARED_CAP');
  if (remaining * 10000n + issued > maximum) issues.push('COMBINED_SUPPLY_EXCEEDS_DECLARED_CAP');
  return {
    schema: 'neo.retokenization.reconciliation.v1',
    symbol, state: 'ARITHMETIC_ONLY_UNVERIFIED_INPUTS',
    retiredSourceRawUnits: retired.toString(), remainingSourceRawUnits: remaining.toString(), issuedTargetRawUnits: issued.toString(),
    combinedActiveTargetEquivalentRawUnits: (remaining * 10000n + issued).toString(),
    declaredMaximumTargetRawUnits: maximum.toString(),
    mathConsistent: issues.length === 0, issues,
    sourceEvidenceVerified: false, issuerAuthorityVerified: false, executionEnabled: false
  };
}
