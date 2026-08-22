import type { CesNormalizedRecord, NomniMetric } from './types'
import { calculateNomniMetrics } from './coordinator'

export type NomniMarketPacket = {
  exchangeId: string
  sourceRecords: CesNormalizedRecord[]
  metrics: NomniMetric[]
  generatedAt: string
}

export function buildNomniMarketPacket(exchangeId: string, records: CesNormalizedRecord[]): NomniMarketPacket {
  return {
    exchangeId,
    sourceRecords: records,
    metrics: calculateNomniMetrics(records),
    generatedAt: new Date().toISOString()
  }
}
