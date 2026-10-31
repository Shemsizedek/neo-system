import crypto from 'node:crypto';

const fail = (reason, checks = {}) => ({status:'HOLD', eligibleCollateralUsd:null, reason, checks});
const positive = x => typeof x === 'number' && Number.isFinite(x) && x > 0;
const hex64 = x => typeof x === 'string' && /^[0-9a-f]{64}$/i.test(x);
const isInt = x => Number.isSafeInteger(x) && x >= 0;

/**
 * Read-only collateral evidence assessment.
 * All market / balance facts are untrusted externally supplied snapshots and MUST
 * be independently sourced; caller must check signature and indexer provenance.
 * No ledger, key, settlement or custody side effects.
 */
export function assessNomniCollateral({asset, network, wallet, market, reviews, now=Date.now(), maxAgeMs=300_000}={}) {
  if (asset !== 'NOMNI' || network !== 'bitcoin-mainnet-counterparty') return fail('ASSET_OR_NETWORK_UNVERIFIED');
  if (!wallet || !hex64(wallet.blockHash) || !isInt(wallet.blockHeight) ||
    !positive(wallet.quantity) || wallet.asset !== 'NOMNI') return fail('WALLET_SNAPSHOT_INVALID');
  if (wallet.controlVerified !== true || wallet.legalOwnershipVerified !== true) return fail('CONTROL_OR_TITLE_PENDING');
  if (!Array.isArray(wallet.independentIndexerBlockHashes) ||
      wallet.independentIndexerBlockHashes.length < 2 ||
      !wallet.independentIndexerBlockHashes.every(x => x === wallet.blockHash)) return fail('INDEXER_CONSENSUS_PENDING');
  if (!market || !positive(market.btcUsd) || !positive(market.btcBidPerNomni) ||
      !Number.isFinite(market.executableBidNomni) || market.executableBidNomni < wallet.quantity) return fail('EXECUTABLE_LIQUIDITY_NOT_PROVEN');
  if (!Number.isFinite(market.timestamp) || market.timestamp > now ||
    now-market.timestamp > maxAgeMs || !market.venue || !market.marketEvidenceId) return fail('MARKET_EVIDENCE_STALE_OR_UNSOURCED');
  if (!reviews || reviews.accounting !== 'APPROVED' || reviews.valuation !== 'APPROVED' ||
    reviews.legal !== 'APPROVED' || reviews.surety !== 'APPROVED' || reviews.court !== 'APPROVED') return fail('PROFESSIONAL_APPROVAL_PENDING');
  if (!Number.isFinite(reviews.haircut) || reviews.haircut < 0 || reviews.haircut >= 1) return fail('HAIRCUT_UNAPPROVED');
  const referenceUsd = wallet.quantity * market.btcBidPerNomni * market.btcUsd;
  const eligibleCollateralUsd = referenceUsd * (1-reviews.haircut);
  if (!positive(eligibleCollateralUsd) || !Number.isFinite(eligibleCollateralUsd)) return fail('VALUATION_UNSUPPORTED');
  const evidenceHash=crypto.createHash('sha256').update(JSON.stringify({asset,network,wallet,market,reviews})).digest('hex');
  return {status:'REVIEW_READY', executionEnabled:false, eligibleCollateralUsd, referenceUsd, evidenceHash,
    limits:'Non-binding read-only analytical output; no custody, legal perfection, bond or court acceptance established by this function.'};
}
