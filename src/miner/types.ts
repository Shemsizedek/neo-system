export type MinerStatus = 'ONLINE' | 'DEGRADED' | 'OFFLINE'
export type CurrencyStatus = 'ACTIVE' | 'PENDING' | 'REFERENCE_ONLY' | 'DISABLED'

export interface MinerNode {
  id: string
  model: string
  facility: string
  worker: string
  status: MinerStatus
  hashrateThs: number
  targetThs: number
  powerWatts: number
  efficiencyJTh: number
  temperatureC: number
  uptimePct: number
  pool: string
}

export interface CurrencyRail {
  code: string
  name: string
  type: 'FIAT' | 'DIGITAL' | 'WORLD_ASSET'
  payment: boolean
  settlement: boolean
  fx: boolean
  status: CurrencyStatus
}

export interface MiningContract {
  id: string
  product: string
  hashrateThs: number
  termMonths: number
  paymentCurrency: string
  basePriceUsd: number
  estimatedBtc: number
  status: 'DRAFT' | 'PAYMENT_PENDING' | 'ACTIVE' | 'COMPLETED'
  createdAt: string
}
