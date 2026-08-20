import type { CesCoordinatorAgent, CesExchange } from './types'

export const nmniExchange: CesExchange = {
  xid: 'NMNI',
  name: 'World Open Market Exchange',
  networkId: 'CEN1098',
  serverId: 'CES0001',
  serverUrl: 'https://www.community-exchange.org',
  currencyName: 'Nomni',
  currencyPlural: 'NEO',
  symbol: '∞',
  exchangeType: 'Mutual Credit',
  levyRatePercent: 0.09,
  conversionRate: '33 ∞/hour',
  linkedExchanges: ['NCES', 'TSCU', 'MOME', 'XCPC', 'BOND', 'HEMP'],
  active: true
}

export const cesExchangeRegistry: CesExchange[] = [
  nmniExchange,
  ...nmniExchange.linkedExchanges.map((xid) => ({
    xid,
    name: xid,
    networkId: nmniExchange.networkId,
    serverId: nmniExchange.serverId,
    serverUrl: nmniExchange.serverUrl,
    currencyName: 'Unknown',
    currencyPlural: 'Unknown',
    symbol: '',
    exchangeType: 'Linked CES Exchange',
    linkedExchanges: ['NMNI'],
    active: true
  }))
]

const readOnlyPermissions = [
  'READ_EXCHANGE',
  'READ_MARKET',
  'READ_BALANCES',
  'READ_ACTIVITY',
  'READ_TRANSACTIONS'
] as const

export const cesCoordinatorAgents: CesCoordinatorAgent[] = cesExchangeRegistry.map((exchange) => ({
  id: `NEO-CES-${exchange.xid}`,
  exchangeId: exchange.xid,
  displayName: `${exchange.xid} CES Coordinator Agent`,
  permissions: [...readOnlyPermissions],
  writeEnabled: false,
  sourcePreference: ['CES2', 'CEN_FEDERATION', 'CES_LEGACY']
}))

export function getExchange(xid: string) {
  return cesExchangeRegistry.find((exchange) => exchange.xid === xid.toUpperCase())
}

export function getCoordinatorAgent(xid: string) {
  return cesCoordinatorAgents.find((agent) => agent.exchangeId === xid.toUpperCase())
}
