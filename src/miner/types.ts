export type MinerStatus = 'MINING' | 'WARNING' | 'OFFLINE' | 'MAINTENANCE'
export type CurrencyKind = 'FIAT' | 'DIGITAL' | 'WORLD_CURRENCY'
export type CurrencyStatus = 'SUPPORTED' | 'PENDING' | 'REFERENCE_ONLY' | 'DISABLED'

export interface Miner {
  id: string
  farm: string
  facility: string
  model: string
  hashrateTh: number
  powerW: number
  tempC: number
  efficiencyJTh: number
  uptimePct: number
  status: MinerStatus
  pool: string
}

export interface Currency {
  code: string
  name: string
  kind: CurrencyKind
  region: string
  payment: boolean
  settlement: boolean
  fx: boolean
  status: CurrencyStatus
}

export interface MiningContract {
  id: string
  customer: string
  hashrateTh: number
  termMonths: number
  paymentCurrency: string
  amount: number
  status: 'ACTIVE' | 'PAYMENT_PENDING' | 'COMPLETED'
  estimatedBtc: number
}

export interface PaymentQuote {
  id: string
  contractId: string
  currency: string
  amount: number
  btcReference: number
  fee: number
  status: 'ACTIVE' | 'PAID' | 'EXPIRED'
}
