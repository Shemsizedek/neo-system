export type CesPermission =
  | 'READ_EXCHANGE'
  | 'READ_MARKET'
  | 'READ_BALANCES'
  | 'READ_ACTIVITY'
  | 'READ_TRANSACTIONS'
  | 'WRITE_TRANSACTION'
  | 'WRITE_MEMBER'

export type CesDataClass = 'PUBLIC' | 'AUTHORIZED' | 'SENSITIVE'
export type CesSourceKind = 'CES_LEGACY' | 'CES2' | 'CEN_FEDERATION'
export type CesRecordKind = 'EXCHANGE' | 'OFFER' | 'WANT' | 'BALANCE' | 'ACTIVITY' | 'TRANSACTION'

export type CesExchange = {
  xid: string
  name: string
  networkId: string
  serverId: string
  serverUrl: string
  currencyName: string
  currencyPlural: string
  symbol: string
  exchangeType: string
  levyRatePercent?: number
  conversionRate?: string
  linkedExchanges: string[]
  active: boolean
}

export type CesCoordinatorAgent = {
  id: string
  exchangeId: string
  displayName: string
  permissions: CesPermission[]
  writeEnabled: boolean
  sourcePreference: CesSourceKind[]
}

export type CesNormalizedRecord<T = unknown> = {
  id: string
  exchangeId: string
  kind: CesRecordKind
  dataClass: CesDataClass
  source: CesSourceKind
  observedAt: string
  payload: T
}

export type CesAuditEvent = {
  id: string
  agentId: string
  exchangeId: string
  action: CesPermission | 'SYNC'
  source: CesSourceKind
  records: number
  status: 'SUCCESS' | 'DENIED' | 'ERROR'
  timestamp: string
  message?: string
}

export type NomniMetric = {
  key: string
  label: string
  value: number | null
  unit?: string
  methodology: string
  sourceRecordKinds: CesRecordKind[]
  derived: true
  calculatedAt: string
}

export type CesMarketQuote = {
  asset: string
  quoteCurrency: 'USD'
  unitPrice: number
  sampleSize: number
  sourceRecordIds: string[]
  observedAt: string
  methodology: string
}

export type CesSnapshot = {
  exchange: CesExchange
  records: CesNormalizedRecord[]
  audit: CesAuditEvent[]
}
