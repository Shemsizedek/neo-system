// Read-only Counterparty trade-history normalization. Never infer timestamps or executions.
const VALID_ASSET = /^[A-Z0-9._-]{1,64}$/;
export function validateAsset(v) {
  const s = String(v || '').trim().toUpperCase();
  return VALID_ASSET.test(s) ? s : null;
}
function amount(row, side) {
  const v = row[`${side}_quantity_normalized`] ?? row[`${side}_quantity_normalized_value`];
  const n = Number(v);
  // A raw integer is not an amount: precision cannot be inferred from a missing normalization.
  return v === undefined || v === null || !Number.isFinite(n) || n <= 0 ? null : n;
}
export function normalizeCompletedMatch(row, base, quote) {
  const status = String(row.status || '').toLowerCase();
  if (status !== 'completed') return null; // BTC-pending matches are not completed trades.
  const fa = String(row.forward_asset || '').toUpperCase();
  const ba = String(row.backward_asset || '').toUpperCase();
  if (!((fa === base && ba === quote) || (fa === quote && ba === base))) return null;
  const fq = amount(row, 'forward');
  const bq = amount(row, 'backward');
  if (!fq || !bq) return null;
  const baseQuantity = fa === base ? fq : bq;
  const quoteQuantity = fa === quote ? fq : bq;
  const time = row.block_time ?? row.match_block_time ?? null;
  const timestamp = typeof time === 'number' && time > 1e9 ? time :
    typeof time === 'string' && /^\\d{10}$/.test(time) ? Number(time) :
    typeof time === 'string' ? Math.floor(Date.parse(time) / 1000) : NaN;
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  const price = quoteQuantity / baseQuantity;
  if (!Number.isFinite(price) || price <= 0) return null;
  return {
    id: String(row.id || row.order_match_id || [row.tx0_hash,row.tx1_hash].filter(Boolean).join('_')),
    time: timestamp, block_index: row.block_index ?? null,
    base, quote, base_quantity: baseQuantity, quote_quantity: quoteQuantity,
    price, status: 'completed'
  };
}
export function makeCandles(matches, seconds) {
  if (![60,300,900,3600,14400,86400,604800].includes(seconds)) throw new Error('Unsupported timeframe');
  const sorted = [...matches].sort((a,b)=> a.time-b.time || String(a.id).localeCompare(String(b.id)));
  const buckets = new Map();
  for (const trade of sorted) {
    const time = Math.floor(trade.time/seconds)*seconds;
    let c=buckets.get(time);
    if (!c) {
      c={time,open:trade.price,high:trade.price,low:trade.price,close:trade.price,
        base_volume:0,quote_volume:0,trades:0}; buckets.set(time,c);
    }
    c.high=Math.max(c.high,trade.price);
    c.low=Math.min(c.low,trade.price);
    c.close=trade.price;
    c.base_volume+=trade.base_quantity;
    c.quote_volume+=trade.quote_quantity;
    c.trades+=1;
  }
  return [...buckets.values()].sort((a,b)=>a.time-b.time);
}
export function availableIndicators(candles, period = 14) {
  const prices = candles.map(c=>c.close);
  let ema = null;
  let avgGain = null, avgLoss = null;
  const factor=2/(period+1);
  return candles.map((c,i)=>{
    const window=prices.slice(Math.max(0,i-period+1),i+1);
    const sma=window.length===period ? window.reduce((a,b)=>a+b,0)/period : null;
    ema=ema===null ? prices[i] : factor*prices[i]+(1-factor)*ema;
    if (i > 0) {
      const delta=prices[i]-prices[i-1];
      const gain=Math.max(0,delta), loss=Math.max(0,-delta);
      if (avgGain===null) { avgGain=gain; avgLoss=loss; }
      else { avgGain=((period-1)*avgGain+gain)/period; avgLoss=((period-1)*avgLoss+loss)/period; }
    }
    const rsi=i>=period && avgGain!==null ? (avgLoss===0 ? 100 : 100-100/(1+avgGain/avgLoss)) : null;
    return {time:c.time,sma,ema: i>=period-1 ? ema : null,rsi};
  });
}
