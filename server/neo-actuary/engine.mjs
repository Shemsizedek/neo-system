// NEO-ACT-001: deterministic, read-only treasury actuarial calculations.
// Monetary inputs use integer minor units as decimal strings; no floating-point currency arithmetic.
export const VERSION = 'NEO-ACT-001';
const integer = (value, field) => {
  if (typeof value !== 'string' || !/^(0|[1-9][0-9]*)$/.test(value)) throw new TypeError(field + ' must be a non-negative integer string');
  return BigInt(value);
};
const bps = (value, field) => {
  if (!Number.isInteger(value) || value < 0 || value > 10000) throw new RangeError(field + ' must be integer 0..10000');
  return BigInt(value);
};
const requireRecords = (records, field) => {
  if (!Array.isArray(records)) throw new TypeError(field + ' must be an array');
  return records;
};
const sum = list => list.reduce((acc, n) => acc + n, 0n);
const division = (a, b) => b === 0n ? null : ((a * 10000n) / b).toString();
export function assessTreasury({assets=[], liabilities=[], currency, asOf, scenario={}}) {
  if (typeof currency !== 'string' || !/^[A-Z0-9]{2,16}$/.test(currency)) throw new TypeError('Explicit currency/unit required');
  if (typeof asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(asOf) || Number.isNaN(Date.parse(asOf + 'T00:00:00Z'))) throw new TypeError('Valid asOf date required');
  const identifiers = new Set();
  const check = (r, group) => {
    if (!r || typeof r.id !== 'string' || !r.id.trim() || identifiers.has(r.id)) throw new TypeError('Unique record id required');
    identifiers.add(r.id);
    if (r.currency !== currency) throw new TypeError('Mixed monetary units prohibited; convert with documented FX provenance before assessment');
    if (r.verified !== true) throw new TypeError('Unverified records cannot enter reserve calculation');
    if (typeof r.evidenceId !== 'string' || !r.evidenceId.trim()) throw new TypeError('Evidence reference required');
    return integer(r.amountMinor, group + '.amountMinor');
  };
  const rawAssets = sum(requireRecords(assets, 'assets').map(r => check(r, 'asset')));
  const obligations = sum(requireRecords(liabilities, 'liabilities').map(r => check(r, 'liability')));
  const haircut = bps(scenario.assetHaircutBps ?? 0, 'assetHaircutBps');
  const shock = bps(scenario.liabilityShockBps ?? 0, 'liabilityShockBps');
  const stressedAssets = rawAssets * (10000n - haircut) / 10000n;
  const stressedLiabilities = obligations * (10000n + shock) / 10000n;
  const net = rawAssets - obligations;
  const stressedNet = stressedAssets - stressedLiabilities;
  return {
    schema: VERSION, asOf, currency, status: 'MODEL_OUTPUT_NOT_AUDITED',
    observed: {assetsMinor:rawAssets.toString(), liabilitiesMinor:obligations.toString(), netMinor:net.toString(),
      coverageBps:division(rawAssets, obligations), assetCount:assets.length, liabilityCount:liabilities.length},
    stress: {assetHaircutBps:Number(haircut), liabilityShockBps:Number(shock),
      assetsMinor:stressedAssets.toString(), liabilitiesMinor:stressedLiabilities.toString(),
      netMinor:stressedNet.toString(), coverageBps:division(stressedAssets, stressedLiabilities),
      shortfallMinor:stressedNet < 0n ? (-stressedNet).toString() : '0'},
    limitations: ['Only explicitly verified records included','No actuarial certification or solvency opinion','No liquidity/maturity modeling in this gate','Null coverage means no recorded liabilities','Values are not price-discovery or ownership proofs']
  };
}
