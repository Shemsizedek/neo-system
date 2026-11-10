import crypto from 'node:crypto'

// Research-only benchmark contracts. No pricing feed, signer, wallet or settlement adapter.
export const BENCHMARK_COMPONENTS = Object.freeze(['BTC', 'XCP', 'NOMNI'])
const DEFAULT_WEIGHTS = Object.freeze({BTC: 0.7, XCP: 0.15, NOMNI: 0.15})
const AGREEMENT_STATUSES = new Set(['DRAFT', 'PROPOSED', 'ADOPTED', 'SUSPENDED', 'RETIRED'])
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex')
const nonempty = value => typeof value === 'string' && value.trim().length > 0
const field = (object, snake, camel) => object?.[snake] ?? object?.[camel]
const failure = (reason, details = {}) => ({status: 'UNAVAILABLE', reason, simulation: true, executable: false, ...details})

// Hash the complete, ordered agreement excluding the hash itself. Output keys match
// commerce/neo-miner/benchmark-agreement.schema.json.
export function canonicalAgreement(input) {
  const agreement_id = field(input, 'agreement_id', 'agreementId')
  const benchmark_unit = field(input, 'benchmark_unit', 'benchmarkUnit') ?? 'BTC'
  const effective_at = field(input, 'effective_at', 'effectiveAt') ?? null
  const status = input?.status ?? 'PROPOSED'
  if (!nonempty(agreement_id) || !nonempty(input?.version)) throw new Error('agreement_identity_required')
  if (!AGREEMENT_STATUSES.has(status)) throw new Error('invalid_agreement_status')
  if (!nonempty(benchmark_unit)) throw new Error('invalid_benchmark_unit')
  if (effective_at !== null && (!nonempty(effective_at) || !Number.isFinite(Date.parse(effective_at)))) {
    throw new Error('invalid_effective_at')
  }
  const document = {
    agreement_id,
    version: input.version,
    title: 'Standard Benchmark Agreement for Bitcoin',
    status,
    benchmark_unit,
    settlement_assets: [...BENCHMARK_COMPONENTS],
    methodology: input.methodology ?? 'Research-only, synthetic weighted composite',
    governance: input.governance ?? 'Draft; no adoption or public authority implied',
    effective_at,
    government_endorsement: false
  }
  // The hash is over exactly the document fields before document_hash is added.
  const canonical = JSON.stringify(Object.fromEntries(Object.entries(document).sort(([a], [b]) => a.localeCompare(b))))
  const hash = sha256(canonical)
  return {document: {...document, document_hash: hash}, hash}
}

function normalizedObservation(input) {
  return {
    observation_id: field(input, 'observation_id', 'observationId'),
    asset: input?.asset,
    price: input?.price,
    quote_currency: field(input, 'quote_currency', 'quoteCurrency'),
    source: input?.source,
    source_market: field(input, 'source_market', 'sourceMarket') ?? null,
    observed_at: field(input, 'observed_at', 'observedAt'),
    status: input?.status,
    executable: input?.executable,
    simulation: input?.simulation
  }
}

export function validateBenchmarkObservation(input, {now = new Date().toISOString(), maxAgeMs = 15 * 60 * 1000, futureToleranceMs = 60 * 1000} = {}) {
  const obs = normalizedObservation(input)
  const required = ['observation_id', 'asset', 'price', 'quote_currency', 'source', 'observed_at', 'status']
  const missing = required.filter(k => obs[k] === undefined || obs[k] === null || obs[k] === '')
  const supported = BENCHMARK_COMPONENTS.includes(obs.asset)
  const positive = typeof obs.price === 'number' && Number.isFinite(obs.price) && obs.price > 0
  const timestamp = typeof obs.observed_at === 'string' ? Date.parse(obs.observed_at) : NaN
  const currentTime = now instanceof Date ? now.getTime() : Date.parse(now)
  const reasons = []
  if (missing.length) reasons.push('MISSING_REQUIRED_FIELDS')
  if (!supported) reasons.push('UNSUPPORTED_ASSET')
  if (!positive) reasons.push('INVALID_PRICE')
  if (!nonempty(obs.observation_id) || !nonempty(obs.source)) reasons.push('INVALID_ID_OR_SOURCE')
  if (!/^[A-Z]{3,8}$/.test(obs.quote_currency ?? '')) reasons.push('INVALID_QUOTE_CURRENCY')
  if (!Number.isFinite(timestamp) || !Number.isFinite(currentTime)) reasons.push('INVALID_TIMESTAMP')
  else if (timestamp > currentTime + futureToleranceMs || currentTime - timestamp > maxAgeMs) reasons.push('STALE_OR_FUTURE_DATA')
  if (obs.status !== 'VALID') reasons.push('OBSERVATION_NOT_VALID')
  if (obs.simulation !== true || obs.executable !== false) reasons.push('NOT_RESEARCH_ONLY')
  return {valid: reasons.length === 0, missing, supported, positive, reasons, observation: obs}
}

// Fail-closed synthetic index calculator; never reports a live/executable market quote.
// Two independently identified simulated observations per asset are required.
export function calculateComposite(observations, weights = DEFAULT_WEIGHTS, options = {}) {
  const now = options.now ?? new Date().toISOString()
  const maxAgeMs = options.maxAgeMs ?? 15 * 60 * 1000
  const futureToleranceMs = options.futureToleranceMs ?? 60 * 1000
  const maxSourceSpread = options.maxSourceSpread ?? 0.05
  if (!Array.isArray(observations)) return failure('INVALID_OBSERVATIONS')
  if (!weights || Object.keys(weights).length !== BENCHMARK_COMPONENTS.length ||
      !BENCHMARK_COMPONENTS.every(a => typeof weights[a] === 'number' && Number.isFinite(weights[a]) && weights[a] >= 0 && weights[a] <= 1) ||
      Math.abs(BENCHMARK_COMPONENTS.reduce((sum, a) => sum + weights[a], 0) - 1) > 1e-9) {
    return failure('INVALID_WEIGHTS')
  }
  if (typeof maxSourceSpread !== 'number' || !Number.isFinite(maxSourceSpread) || maxSourceSpread < 0 || maxSourceSpread > 1) {
    return failure('INVALID_SPREAD_LIMIT')
  }
  const inspected = observations.map(o => validateBenchmarkObservation(o, {now, maxAgeMs, futureToleranceMs}))
  if (inspected.some(o => !o.valid)) {
    return failure('INVALID_OBSERVATIONS', {rejected: inspected.map((o, index) => ({index, reasons: o.reasons})).filter(x => x.reasons.length)})
  }
  const normalized = inspected.map(o => o.observation)
  const ids = normalized.map(o => o.observation_id)
  if (new Set(ids).size !== ids.length) return failure('DUPLICATE_OBSERVATION_ID')
  const absent = BENCHMARK_COMPONENTS.filter(a => !normalized.some(o => o.asset === a))
  if (absent.length) return failure('MISSING_MARKET_DATA', {missing: absent})
  const quotes = new Set(normalized.map(o => o.quote_currency))
  if (quotes.size !== 1) return failure('MIXED_QUOTE_CURRENCY')

  const component_prices = {}
  for (const asset of BENCHMARK_COMPONENTS) {
    const group = normalized.filter(o => o.asset === asset)
    const sources = group.map(o => o.source.trim().toLowerCase())
    if (group.length < 2 || new Set(sources).size < 2) {
      return failure('INSUFFICIENT_INDEPENDENT_SOURCES', {asset})
    }
    const prices = group.map(o => o.price).sort((a, b) => a - b)
    const midpoint = Math.floor(prices.length / 2)
    const median = prices.length % 2 ? prices[midpoint] : (prices[midpoint - 1] + prices[midpoint]) / 2
    if (!Number.isFinite(median) || median <= 0 || (prices.at(-1) - prices[0]) / median > maxSourceSpread) {
      return failure('CONFLICTING_OBSERVATIONS', {asset})
    }
    component_prices[asset] = median
  }
  const value = BENCHMARK_COMPONENTS.reduce((sum, a) => sum + component_prices[a] * weights[a], 0)
  if (!Number.isFinite(value) || value <= 0) return failure('INVALID_COMPOSITE')
  const as_of = (now instanceof Date ? now : new Date(now)).toISOString()
  const stableInputs = normalized.sort((a, b) => `${a.asset}|${a.source}|${a.observation_id}`.localeCompare(`${b.asset}|${b.source}|${b.observation_id}`))
  return {
    status: 'SIMULATED', simulation: true, executable: false, not_for_trading: true,
    value, quote_currency: normalized[0].quote_currency, weights: {...weights},
    component_prices, as_of, input_count: stableInputs.length,
    inputs_hash: sha256(JSON.stringify({observations: stableInputs, weights, as_of})),
    disclaimer: 'Research simulation only; not a live market price, settlement rate, reserve claim or regulatory approval.'
  }
}
