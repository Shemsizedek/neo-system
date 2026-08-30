export const MINING_SOURCE_TYPES = Object.freeze({
  NATIVE_BTC_HASHING: 'NATIVE_BTC_HASHING',
  CONVERTED_TO_BTC: 'CONVERTED_TO_BTC',
  CLOUD_HASHPOWER: 'CLOUD_HASHPOWER',
  EXTERNAL_BTC_PAYOUT: 'EXTERNAL_BTC_PAYOUT',
});

export const SOURCE_STATUS = Object.freeze({
  DISABLED: 'DISABLED',
  TEST: 'TEST',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
});

const registry = new Map();

export function normalizeSource(input) {
  if (!input || typeof input !== 'object') throw new TypeError('source required');
  if (!input.id || !input.name || !input.type) throw new TypeError('id, name and type are required');
  if (!Object.values(MINING_SOURCE_TYPES).includes(input.type)) throw new RangeError('unsupported mining source type');

  return Object.freeze({
    id: String(input.id),
    name: String(input.name),
    type: input.type,
    status: input.status ?? SOURCE_STATUS.TEST,
    payoutAsset: input.payoutAsset ?? 'BTC',
    underlyingAsset: input.underlyingAsset ?? null,
    directBitcoinHashing: Boolean(input.directBitcoinHashing),
    authoritativeForHashrate: Boolean(input.authoritativeForHashrate),
    adapter: input.adapter ?? null,
    notes: input.notes ?? null,
  });
}

export function registerMiningSource(input) {
  const source = normalizeSource(input);
  registry.set(source.id, source);
  return source;
}

export function getMiningSource(id) {
  return registry.get(String(id)) ?? null;
}

export function listMiningSources() {
  return [...registry.values()];
}

export function classifyProductionEvent(sourceId, event = {}) {
  const source = getMiningSource(sourceId);
  if (!source) throw new Error(`unknown mining source: ${sourceId}`);

  return Object.freeze({
    sourceId: source.id,
    sourceType: source.type,
    payoutAsset: source.payoutAsset,
    underlyingAsset: source.underlyingAsset,
    directBitcoinHashing: source.directBitcoinHashing,
    reportedHashrate: source.authoritativeForHashrate ? (event.reportedHashrate ?? null) : null,
    grossPayoutSats: event.grossPayoutSats ?? null,
    txid: event.txid ?? null,
    observedAt: event.observedAt ?? new Date().toISOString(),
    metadata: event.metadata ?? {},
  });
}

// CryptoTab's public FAQ states its software mines XMR and converts the result to BTC.
// Therefore it must never be represented as direct Bitcoin SHA-256 hashing by NEO.
registerMiningSource({
  id: 'cryptotab',
  name: 'CryptoTab',
  type: MINING_SOURCE_TYPES.CONVERTED_TO_BTC,
  status: SOURCE_STATUS.TEST,
  payoutAsset: 'BTC',
  underlyingAsset: 'XMR',
  directBitcoinHashing: false,
  authoritativeForHashrate: false,
  adapter: 'cryptotab',
  notes: 'External production source. Account/payout integration requires supported credentials or an approved import path; never store user passwords in source configuration.',
});
