import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {canonicalAgreement, calculateComposite, validateBenchmarkObservation} from './benchmarkAgreement.mjs'

const AT = '2026-11-10T16:00:00.000Z'
const fixture = () => ['BTC', 'XCP', 'NOMNI'].flatMap((asset, i) => [0, 1].map(j => ({
  observation_id: `synthetic-${asset}-${j + 1}`,
  asset,
  price: [100000, 10, 1][i] * (j ? 1.01 : 1),
  quote_currency: 'USD', source: `independent-demo-source-${j + 1}`,
  source_market: `simulation-venue-${j + 1}`,
  observed_at: AT, status: 'VALID', simulation: true, executable: false
})))
const calculate = (records, weights, options = {}) => calculateComposite(records, weights ?? {BTC: 0.7, XCP: 0.15, NOMNI: 0.15}, {now: AT, ...options})
const changed = (index, changes) => fixture().map((v, i) => i === index ? {...v, ...changes} : v)

test('agreement is deterministic and has snake_case contract fields', () => {
  const input = {agreementId: 'SBA-BTC-001', version: '0.1', methodology: 'synthetic weighted composite', governance: 'proposal'}
  const a = canonicalAgreement(input)
  assert.equal(a.document.status, 'PROPOSED')
  assert.equal(a.document.government_endorsement, false)
  assert.match(a.hash, /^[a-f0-9]{64}$/)
  assert.equal(a.document.document_hash, a.hash)
  assert.equal(canonicalAgreement({...input}).hash, a.hash)
  const schema = JSON.parse(fs.readFileSync(new URL('../../commerce/neo-miner/benchmark-agreement.schema.json', import.meta.url)))
  assert.deepEqual(schema.required.filter(k => !(k in a.document)), [])
  assert.equal(schema.properties.government_endorsement.const, false)
  assert.throws(() => canonicalAgreement({version: '0.1'}), /agreement_identity_required/)
})

test('observations use the documented schema fields and validate', () => {
  const record = fixture()[0]
  const schema = JSON.parse(fs.readFileSync(new URL('../../commerce/neo-miner/benchmark-observation.schema.json', import.meta.url)))
  assert.deepEqual(schema.required.filter(k => !(k in record)), [])
  assert.equal(validateBenchmarkObservation(record, {now: AT}).valid, true)
  assert.equal(validateBenchmarkObservation({...record, price: '100000'}, {now: AT}).valid, false)
})

test('missing components fail closed', () => {
  const result = calculate(fixture().filter(o => o.asset === 'BTC'))
  assert.equal(result.status, 'UNAVAILABLE')
  assert.deepEqual(result.missing, ['XCP', 'NOMNI'])
})

test('complete independent synthetic observations generate reproducible non-executable results', () => {
  const a = calculate(fixture())
  const b = calculate(fixture().reverse())
  assert.equal(a.status, 'SIMULATED')
  assert.equal(a.simulation, true)
  assert.equal(a.executable, false)
  assert.equal(a.not_for_trading, true)
  assert.ok(a.value > 0)
  assert.equal(a.quote_currency, 'USD')
  assert.equal(a.inputs_hash, b.inputs_hash)
  assert.equal(a.value, b.value)
})

test('mismatched quote currencies rejected', () => {
  assert.equal(calculate(changed(2, {quote_currency: 'EUR'})).reason, 'MIXED_QUOTE_CURRENCY')
})

test('stale and future timestamps rejected', () => {
  assert.equal(calculate(changed(1, {observed_at: '2026-11-09T16:00:00.000Z'})).reason, 'INVALID_OBSERVATIONS')
  assert.ok(calculate(changed(1, {observed_at: '2026-11-09T16:00:00.000Z'})).rejected[0].reasons.includes('STALE_OR_FUTURE_DATA'))
  assert.equal(calculate(changed(0, {observed_at: '2026-11-11T16:00:00.000Z'})).reason, 'INVALID_OBSERVATIONS')
})

test('duplicate ids and duplicate sources rejected', () => {
  assert.equal(calculate(changed(1, {observation_id: 'synthetic-BTC-1'})).reason, 'DUPLICATE_OBSERVATION_ID')
  assert.equal(calculate(changed(1, {source: 'independent-demo-source-1'})).reason, 'INSUFFICIENT_INDEPENDENT_SOURCES')
})

test('inconsistent sources fail rather than pick a convenient price', () => {
  assert.equal(calculate(changed(1, {price: 200000})).reason, 'CONFLICTING_OBSERVATIONS')
})

test('negative, nonnumeric, infinite prices rejected', () => {
  for (const price of [-1, '100', Infinity, 0]) assert.equal(calculate(changed(0, {price})).reason, 'INVALID_OBSERVATIONS')
})

test('non-simulated/executable observations refused', () => {
  assert.equal(calculate(changed(0, {simulation: false})).reason, 'INVALID_OBSERVATIONS')
  assert.equal(calculate(changed(0, {executable: true})).reason, 'INVALID_OBSERVATIONS')
})

test('invalid statuses and missing sources rejected', () => {
  assert.equal(calculate(changed(0, {status: 'STALE'})).reason, 'INVALID_OBSERVATIONS')
  assert.equal(calculate(changed(0, {source: ''})).reason, 'INVALID_OBSERVATIONS')
})

test('invalid weights rejected', () => {
  for (const weights of [{BTC: 0.9, XCP: 0.15, NOMNI: 0.15}, {BTC: -0.1, XCP: 0.5, NOMNI: 0.6}, {BTC: Infinity, XCP: 0, NOMNI: 0}, {BTC: 1}]) {
    assert.equal(calculate(fixture(), weights).reason, 'INVALID_WEIGHTS')
  }
})

test('never returns a PUBLISHED or live quote even for a valid sample', () => {
  const result = calculate(fixture())
  assert.notEqual(result.status, 'PUBLISHED')
  assert.match(result.disclaimer, /not a live market price/)
})
