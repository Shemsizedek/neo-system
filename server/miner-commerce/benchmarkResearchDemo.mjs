// Offline, reproducible research fixture. Contains no network or wallet calls.
import {canonicalAgreement, calculateComposite} from './benchmarkAgreement.mjs'

const now = '2026-11-10T16:00:00.000Z'
const observations = ['BTC', 'XCP', 'NOMNI'].flatMap((asset, index) =>
  [0, 1].map(sourceIndex => ({
    observation_id: `DEMO-${asset}-${sourceIndex + 1}`,
    asset,
    price: [100000, 10, 1][index] * (sourceIndex === 0 ? 1 : 1.01),
    quote_currency: 'USD',
    source: `synthetic-source-${sourceIndex + 1}`,
    source_market: `simulation-venue-${sourceIndex + 1}`,
    observed_at: now,
    status: 'VALID',
    simulation: true,
    executable: false
  }))
)
const agreement = canonicalAgreement({
  agreement_id: 'NEO-TBS-POC-001',
  version: '0.1.0-research',
  status: 'PROPOSED',
  methodology: '70% BTC / 15% XCP / 15% NOMNI; synthetic USD observations only',
  governance: 'Independent technical evaluation; no legal or governmental recognition claimed'
})
const composite = calculateComposite(observations, undefined, {now})
if (composite.status !== 'SIMULATED' || composite.executable !== false) {
  throw new Error('research_demo_fail_closed')
}
console.log(JSON.stringify({warning: 'SYNTHETIC RESEARCH DATA ONLY — NOT AN OFFER OR LIVE QUOTE', agreement, composite}, null, 2))
