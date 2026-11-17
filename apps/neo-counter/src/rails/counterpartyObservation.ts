import type { PaymentObservation } from './types';

type ObservationInput = {
  address: string;
  asset: string;
  expectedAmount: number;
  startedAt: string;
  now?: number;
};

type Receive = {
  asset?: string;
  destination?: string;
  status?: string;
  block_time?: unknown;
  block_index?: number;
  tx_hash?: string;
  quantity_normalized?: unknown;
  quantity?: unknown;
  asset_info?: { divisible?: boolean };
};

function blockTimeMs(value: unknown): number {
  // Verbose Counterparty v2 sends use Unix seconds, not ISO strings.
  if (typeof value === 'number') return value * 1000;
  if (typeof value !== 'string' || !value.trim()) return NaN;
  if (/^\d+(?:\.\d+)?$/.test(value)) return Number(value) * 1000;
  return Date.parse(value);
}

export function observeCounterpartyReceives(
  payload: unknown,
  nodePayload: unknown,
  input: ObservationInput,
): PaymentObservation {
  const none: PaymentObservation = { detected: false, confirmed: false, source: 'Counterparty API v2' };
  const started = Date.parse(input.startedAt);
  const now = input.now ?? Date.now();
  if (!Number.isFinite(started) || !Number.isFinite(now) || started > now
      || !Number.isFinite(input.expectedAmount) || input.expectedAmount <= 0) return none;

  const node = (nodePayload as { result?: { server_ready?: boolean; network?: string; counterparty_height?: number } })?.result;
  const height = node?.counterparty_height;
  if (node?.server_ready !== true || node.network !== 'mainnet'
      || typeof height !== 'number' || !Number.isSafeInteger(height) || height <= 0) return none;

  const result = (payload as { result?: unknown })?.result;
  const rows: Receive[] = Array.isArray(result) ? result : Array.isArray(payload) ? payload : [];
  for (const row of rows) {
    if (!row || row.asset !== input.asset || row.destination !== input.address || row.status !== 'valid') continue;
    const timestamp = blockTimeMs(row.block_time);
    // An unknown age must never allow an old receive to satisfy a new order.
    if (!Number.isFinite(timestamp) || timestamp < started || timestamp > now) continue;
    if (typeof row.block_index !== 'number' || !Number.isSafeInteger(row.block_index)
        || row.block_index <= 0 || row.block_index > height) continue;
    if (typeof row.tx_hash !== 'string' || !/^[a-fA-F0-9]{64}$/.test(row.tx_hash)) continue;

    let quantity: number;
    if ((typeof row.quantity_normalized === 'number' || typeof row.quantity_normalized === 'string')
        && String(row.quantity_normalized).trim()) {
      quantity = Number(row.quantity_normalized);
    } else if (typeof row.asset_info?.divisible === 'boolean'
        && (typeof row.quantity === 'number' || typeof row.quantity === 'string')
        && String(row.quantity).trim()) {
      const raw = Number(row.quantity);
      if (!Number.isSafeInteger(raw) || raw < 0) continue;
      quantity = raw / (row.asset_info.divisible ? 100_000_000 : 1);
    } else continue;
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > Number.MAX_SAFE_INTEGER
        || (row.asset_info?.divisible === false && !Number.isSafeInteger(quantity))
        || quantity < input.expectedAmount) continue;

    return { detected: true, confirmed: true, reference: row.tx_hash, amount: quantity, source: none.source };
  }
  return none;
}
