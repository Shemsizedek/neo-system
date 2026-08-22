import type { CesMarketQuote, CesNormalizedRecord, NomniMetric } from './types'
import { calculateNomniMetrics } from './coordinator'

export type NomniMarketPacket = {
  exchangeId: string
  sourceRecords: CesNormalizedRecord[]
  metrics: NomniMetric[]
  quotes: CesMarketQuote[]
  generatedAt: string
}

function numberFrom(payload: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = payload[key]
    const numeric = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN
    if (Number.isFinite(numeric) && numeric > 0) return numeric
  }
  return null
}

function stringFrom(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

export function calculateCesMarketQuotes(records: CesNormalizedRecord[]): CesMarketQuote[] {
  const candidates = new Map<string, Array<{ price: number; record: CesNormalizedRecord }>>()

  for (const record of records) {
    if (record.kind !== 'OFFER' && record.kind !== 'WANT') continue
    if (!record.payload || typeof record.payload !== 'object') continue

    const payload = record.payload as Record<string, unknown>
    const asset = stringFrom(payload, ['asset', 'asset_code', 'symbol', 'currency'])?.toUpperCase()
    const quoteCurrency = stringFrom(payload, ['quoteCurrency', 'quote_currency', 'displayCurrency', 'display_currency'])?.toUpperCase()
    const explicitUsdPrice = numberFrom(payload, ['unitPriceUsd', 'unit_price_usd', 'priceUsd', 'price_usd'])
    const genericPrice = quoteCurrency === 'USD' ? numberFrom(payload, ['unitPrice', 'unit_price', 'price', 'rate']) : null
    const unitPrice = explicitUsdPrice ?? genericPrice

    if (!asset || !unitPrice) continue

    const list = candidates.get(asset) ?? []
    list.push({ price: unitPrice, record })
    candidates.set(asset, list)
  }

  return [...candidates.entries()].map(([asset, samples]) => {
    const newest = samples.reduce((latest, sample) =>
      Date.parse(sample.record.observedAt) > Date.parse(latest.record.observedAt) ? sample : latest
    )

    return {
      asset,
      quoteCurrency: 'USD' as const,
      unitPrice: median(samples.map((sample) => sample.price)),
      sampleSize: samples.length,
      sourceRecordIds: samples.map((sample) => sample.record.id),
      observedAt: newest.record.observedAt,
      methodology: 'Median of explicit positive USD unit-price observations from normalized CES OFFER/WANT records. No price is inferred from balances, counts, conversion-rate labels, or transaction volume.'
    }
  })
}

export function buildNomniMarketPacket(exchangeId: string, records: CesNormalizedRecord[]): NomniMarketPacket {
  return {
    exchangeId,
    sourceRecords: records,
    metrics: calculateNomniMetrics(records),
    quotes: calculateCesMarketQuotes(records),
    generatedAt: new Date().toISOString()
  }
}
