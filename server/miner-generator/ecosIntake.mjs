/** Offline ECOS intake only. No sockets, fetch, keys, signing or financial actions.
 * Pool/worker syntax is not authentication, provider ownership or funded hashrate.
 */
const INTAKE_HOSTS = new Set(['pool.blc.am', 'pool.ecos.am']);
const ACCOUNT = /^[1-9][0-9]{0,19}$/;
const WORKER = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;

export function normalizeEcosWorker(accountId, workerName) {
  if (typeof accountId !== 'string' || !ACCOUNT.test(accountId)) {
    throw new Error('ECOS_ACCOUNT_ID_INVALID');
  }
  if (typeof workerName !== 'string') throw new Error('ECOS_WORKER_INVALID');
  const prefix = `Ecos.${accountId}.`;
  const suffix = workerName.startsWith(prefix) ? workerName.slice(prefix.length) : workerName;
  if (!WORKER.test(suffix)) throw new Error('ECOS_WORKER_OR_ACCOUNT_MISMATCH');
  return Object.freeze({suffix, full: prefix + suffix});
}

export function parseEcosPoolIntake(poolUrl) {
  if (typeof poolUrl !== 'string' || poolUrl.length > 160 || poolUrl !== poolUrl.trim()) {
    throw new Error('ECOS_POOL_URL_INVALID');
  }
  let url;
  try { url = new URL(poolUrl); } catch { throw new Error('ECOS_POOL_URL_INVALID'); }
  // These are observed input names, NOT verified provider endpoint ownership.
  if (url.protocol !== 'stratum+tcp:' || !INTAKE_HOSTS.has(url.hostname) ||
      url.port !== '3333' || url.username || url.password || url.search || url.hash ||
      !['', '/'].includes(url.pathname)) throw new Error('ECOS_POOL_INPUT_NOT_RECOGNIZED');
  return Object.freeze({
    url: `stratum+tcp://${url.hostname}:3333`,
    host: url.hostname, port: 3333,
    transport: 'STRATUM_TCP', tls: false,
    endpointOwnershipVerified: false,
    isBitcoinPaymentDestination: false
  });
}

export function createEcosPrivateIntake(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('ECOS_INTAKE_INVALID');
  const {accountId, workerName, poolUrl, requestedBudgetUsdCents = 1000} = input;
  if (!Number.isSafeInteger(requestedBudgetUsdCents) || requestedBudgetUsdCents <= 0) {
    throw new Error('ECOS_BUDGET_INVALID');
  }
  const worker = normalizeEcosWorker(accountId, workerName);
  const pool = parseEcosPoolIntake(poolUrl);
  return Object.freeze({
    schemaVersion: 1, provider: 'ECOS', provenance: 'USER_SUPPLIED_NOT_AUTHENTICATED',
    accountId, workerName: worker.full, workerSuffix: worker.suffix,
    pool, requestedBudgetUsdCents,
    suppliedInstructionsType: 'ASIC_POOL_CONNECTION', desiredProduct: 'CLOUD_HASHPOWER',
    configurationReviewRequired: true,
    observedHashrateTh: null, activeContractId: null, depositAddress: null,
    accountAuthenticated: false, externalEvidenceVerified: false,
    capacityEligible: false, checkoutEnabled: false, tokenIssuanceEnabled: false,
    automaticReinvestmentEnabled: false, moneyMovementEnabled: false,
    deviceRestartEnabled: false
  });
}

/** Safe report: do not echo account, worker, unknown fields or possible secrets. */
export function summarizeEcosIntake(input = {}) {
  const profile = createEcosPrivateIntake(input);
  return Object.freeze({
    provider: 'ECOS', status: 'BLOCKED_PENDING_PROVIDER_EVIDENCE',
    inputType: profile.suppliedInstructionsType,
    desiredProduct: profile.desiredProduct,
    requestedBudgetUsdCents: profile.requestedBudgetUsdCents,
    observedHashrateTh: null, externalEvidenceVerified: false,
    capacityEligible: false, checkoutEnabled: false, tokenIssuanceEnabled: false,
    automaticReinvestmentEnabled: false, moneyMovementEnabled: false,
    configurationReviewRequired: true,
    blockers: Object.freeze([
      'ACCOUNT_ACCESS_NOT_AUTHENTICATED',
      'POOL_CONFIGURATION_IS_NOT_A_CLOUD_CONTRACT',
      'POOL_AND_USERNAME_RULES_REQUIRE_ACCOUNT_SPECIFIC_CONFIRMATION',
      'NO_CURRENT_PRICED_CONTRACT_OR_INVOICE_WITHIN_BUDGET',
      'NO_VERIFIED_FUNDED_ALLOCATION_OR_POOL_WORK',
      'ECOS_WRITTEN_RESALE_PERMISSION_REQUIRED',
      'COUNTER_SETTLEMENT_AND_CUSTOMER_TERMS_NOT_APPROVED'
    ])
  });
}
