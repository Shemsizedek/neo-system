// NEO eGaaS internal Counterpay rail: offline commitment batching only.
// Deliberately does not accept records, identifiers, phone numbers, addresses, or signing keys.
export const INTERNAL_RAIL_SCHEMA = 'neo-counterpay-internal-rail-v1';
const DIGEST = /^[0-9a-f]{64}$/;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const KINDS = new Set(['IDENTITY', 'COURT_FILING', 'CALL_LOG', 'PROPERTY', 'MEDICAL', 'GOVERNMENT_REGISTRATION', 'AGENT_WORK', 'FINANCIAL_INTENT', 'EDUCATION', 'GENERAL']);
const HIGH_SENSITIVITY = new Set(['IDENTITY', 'CALL_LOG', 'MEDICAL', 'FINANCIAL_INTENT']);
const EXACT_KEYS = ['recordRef', 'recordClass', 'privacy', 'commitment'];
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const exact = (value, keys) => plain(value) && Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key));

export function prepareCounterpayInternalBatch(input, {prepareAnchor} = {}) {
  if (typeof prepareAnchor !== 'function') throw new TypeError('trusted_anchor_preparer_required');
  if (!exact(input, ['entries']) || !Array.isArray(input.entries) || input.entries.length < 1 || input.entries.length > 128) {
    throw new Error('invalid_internal_rail_batch');
  }
  const refs = new Set();
  const commitments = new Set();
  for (const entry of input.entries) {
    if (!exact(entry, EXACT_KEYS) ||
      typeof entry.recordRef !== 'string' || !UUID_V4.test(entry.recordRef) ||
      !KINDS.has(entry.recordClass) ||
      !['RESTRICTED', 'HIGHLY_RESTRICTED'].includes(entry.privacy) ||
      (HIGH_SENSITIVITY.has(entry.recordClass) && entry.privacy !== 'HIGHLY_RESTRICTED') ||
      typeof entry.commitment !== 'string' || !DIGEST.test(entry.commitment) ||
      refs.has(entry.recordRef) || commitments.has(entry.commitment)) {
      throw new Error('opaque_unique_commitments_only');
    }
    refs.add(entry.recordRef);
    commitments.add(entry.commitment);
  }
  const prepared = prepareAnchor({commitments: [...commitments]});
  if (prepared?.state !== 'prepared_offchain' || prepared.anchored !== false ||
      prepared.broadcastEnabled !== false || prepared.crownAuthorized !== false ||
      prepared.transactionId !== null || !DIGEST.test(prepared.root) ||
      !Array.isArray(prepared.proofs) || prepared.proofs.length !== input.entries.length ||
      prepared.counterpartyBroadcastText !== `NEO:eGAAS:1:${prepared.root}`) {
    throw new Error('anchor_preparation_contract_violation');
  }
  const proofs = new Map(prepared.proofs.map(p => [p.commitment, p.proof]));
  if (proofs.size !== commitments.size || [...commitments].some(c => !proofs.has(c))) {
    throw new Error('anchor_membership_contract_violation');
  }
  return {
    schema: INTERNAL_RAIL_SCHEMA,
    rail: 'COUNTERPAY_INTERNAL',
    state: 'prepared_offchain',
    anchoring: {
      network: 'BITCOIN',
      overlay: 'COUNTERPARTY',
      registry: 'NEO_CROWN_CHAIN',
      commitmentRoot: prepared.root,
      candidateBroadcastText: prepared.counterpartyBroadcastText,
      transactionId: null,
      blockHash: null,
      confirmations: 0,
      verified: false,
    },
    receipts: input.entries.map(entry => ({
      recordRef: entry.recordRef,
      recordClass: entry.recordClass,
      privacy: entry.privacy,
      commitment: entry.commitment,
      root: prepared.root,
      proof: proofs.get(entry.commitment),
      evidenceState: 'prepared_offchain',
    })),
    operations: {walletIssuance: false, payment: false, signing: false, broadcast: false, vmExecution: false},
  };
}
