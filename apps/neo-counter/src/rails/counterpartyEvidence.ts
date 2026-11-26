type ExpectedReceive = { address: string; asset: string; expectedAmount: number; startedAt: string };

// Normalized quantities are asset units. Never interpret raw protocol quantities as units.
function units(value: unknown): bigint | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (typeof value === 'number' && (!Number.isFinite(value) || value <= 0)) return null;
  const text = typeof value === 'number' ? value.toFixed(8) : value;
  if (typeof value === 'number' && Number(text) !== value) return null;
  if (!/^(0|[1-9]\d{0,15})(\.\d{1,8})?$/.test(text)) return null;
  const [whole, fraction = ''] = text.split('.');
  const result = BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, '0'));
  return result > 0n ? result : null;
}

function timestamp(value: unknown): number {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0 ? value * 1000 : NaN;
  // Require an explicit timezone for textual timestamps.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return NaN;
  return Date.parse(value);
}

/** Provider evidence precondition only; not order binding or independent chain verification. */
export function matchCounterpartyReceive(row: unknown, expected: ExpectedReceive): { reference: string; amount: number } | null {
  if (!row || typeof row !== 'object') return null;
  const record = row as Record<string, unknown>;
  const started = timestamp(expected.startedAt);
  const observed = timestamp(record.block_time ?? record.timestamp ?? record.created_at);
  const required = units(expected.expectedAmount);
  const received = units(record.quantity_normalized);
  if (!expected.address || !expected.asset || !Number.isFinite(started) || !Number.isFinite(observed) || observed < started) return null;
  if (record.destination !== expected.address || record.asset !== expected.asset) return null;
  if (!Number.isSafeInteger(record.block_index) || (record.block_index as number) <= 0) return null;
  if (record.status !== undefined && record.status !== 'valid') return null;
  if (typeof record.tx_hash !== 'string' || !/^[a-fA-F0-9]{64}$/.test(record.tx_hash)) return null;
  if (required === null || received === null || received < required) return null;
  return { reference: record.tx_hash, amount: Number(received) / 100_000_000 };
}
