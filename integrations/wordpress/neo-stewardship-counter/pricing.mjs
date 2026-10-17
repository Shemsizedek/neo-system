// Integer minor-unit quote calculation. Caller supplies a verified reference;
// TokenScan market panel prices alone do not establish executable liquidity.
const ASSETS = new Set(['TEMPLEBOND', 'PLEDGEBOND']);
function integer(value, name, positive = false) {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) throw new Error('Invalid ' + name);
  const n = BigInt(value);
  if (positive && n === 0n) throw new Error('Invalid ' + name);
  return n;
}
const ceil = (n, d) => (n + d - 1n) / d;
export function quoteStewardship(input, now = Date.now()) {
  if (!ASSETS.has(input.asset)) throw new Error('Unsupported instrument');
  if (!['BTC','XCP','USD'].includes(input.currency)) throw new Error('Unsupported quote currency');
  if (!input.source || !input.referenceId) throw new Error('Missing price provenance');
  if (!Number.isSafeInteger(now) || !Number.isSafeInteger(input.observedAt) ||
      !Number.isSafeInteger(input.expiresAt) || input.observedAt > now ||
      input.expiresAt <= now || input.expiresAt <= input.observedAt ||
      input.expiresAt - input.observedAt > 300000) throw new Error('Stale or invalid reference');
  const quantity = integer(input.quantity, 'quantity', true);
  if (quantity > 999999n) throw new Error('Quantity exceeds preview limit');
  const price = integer(input.unitPriceMinor, 'unit price', true);
  const fees = integer(input.feeAllowanceMinor, 'fee allowance');
  const spread = integer(input.spreadBps, 'spread');
  const rate = integer(input.processorFeeBps, 'processor rate');
  const increment = integer(input.roundingMinor, 'rounding', true);
  if (spread > 10000n || rate >= 10000n) throw new Error('Invalid percentage');
  const base = quantity * price;
  const markup = ceil(base * spread, 10000n);
  // Gross up percentage fees charged on the final rounded total.
  const beforeRounding = ceil((base + markup + fees) * 10000n, 10000n - rate);
  const total = ceil(beforeRounding, increment) * increment;
  const processor = ceil(total * rate, 10000n);
  const s = n => n.toString();
  return {
    service:'holy-stewardship', asset:input.asset, currency:input.currency,
    quantity:input.quantity, referenceId:input.referenceId, source:input.source,
    observedAt:input.observedAt, expiresAt:input.expiresAt,
    marketSubtotalMinor:s(base), spreadMinor:s(markup),
    feeAllowanceMinor:s(fees), processorFeeMinor:s(processor),
    roundingAdjustmentMinor:s(total - base - markup - fees - processor),
    totalMinor:s(total), status:'REFERENCE_PREVIEW', payable:false,
    note:'Market reference only. Live checkout requires confirmed inventory, fees and settlement.'
  };
}
