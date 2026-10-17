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
  if (!(input.conversion ? /^[A-Z][A-Z0-9.]{0,99}$/.test(input.currency) : ['BTC','XCP','USD'].includes(input.currency))) throw new Error('Unsupported quote currency');
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
  let numerator = quantity * price, denominator = 1n;
  if (input.conversion) {
    const c=input.conversion;
    const bond=integer(c.bondPriceSats,'bond price',true), currency=integer(c.currencyPriceSats,'currency price',true), scale=integer(c.scale,'currency scale',true);
    if (quantity*bond > 1000000000n || currency > 10000000000000n || ![1n,100000000n].includes(scale) || input.currencyDecimals !== (scale===1n?0:8) || spread!==900n || fees!==0n || rate!==0n || increment!==1n) throw new Error('Invalid daily conversion policy');
    numerator=quantity*bond*scale;denominator=currency;
  }
  const base = numerator / denominator;
  const markup = ceil(numerator * spread, denominator*10000n);
  // Gross up percentage fees charged on the final rounded total.
  const beforeRounding = input.conversion ? ceil(numerator*(10000n+spread),denominator*10000n) : ceil((base + markup + fees) * 10000n, 10000n - rate);
  const total = ceil(beforeRounding, increment) * increment;
  const processor = ceil(total * rate, 10000n);
  const s = n => n.toString();
  return {
    service:'holy-stewardship', asset:input.asset, currency:input.currency,
    quantity:input.quantity, currencyDecimals:input.currencyDecimals ?? (input.currency==='USD'?2:8), currencyAsset:input.currencyAsset || input.currency, valuationDay:input.valuationDay, referenceId:input.referenceId, source:input.source,
    observedAt:input.observedAt, expiresAt:input.expiresAt,
    marketSubtotalMinor:s(base), marketSubtotalDisplayMinor:input.conversion?s(numerator*100000000n/(denominator*BigInt(input.conversion.scale))):undefined, feesDisplayMinor:input.conversion?s(ceil((total*denominator-numerator)*100000000n,denominator*BigInt(input.conversion.scale))):undefined, spreadMinor:s(markup),
    feeAllowanceMinor:s(fees), processorFeeMinor:s(processor),
    roundingAdjustmentMinor:s(total - base - markup - fees - processor),
    totalMinor:s(total), status:'REFERENCE_PREVIEW', payable:false,
    note:'Market reference only. Live checkout requires confirmed inventory, fees and settlement.'
  };
}
