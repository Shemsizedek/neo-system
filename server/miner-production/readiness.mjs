import crypto from 'node:crypto'

export const REQUIRED_CAPABILITIES = [
  'bitcoin_rpc',
  'counterparty_api',
  'mining_pool',
  'miner_agents',
  'fx_rates',
  'payment_gateway',
  'contract_store',
  'settlement_store',
  'webhook_verification',
  'compliance_gate'
]

const httpsUrl = value => {
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

export function evaluateProductionReadiness(config = {}) {
  const checks = {
    bitcoin_rpc: Boolean(config.bitcoin?.enabled && (httpsUrl(config.bitcoin?.rpcUrl) || config.bitcoin?.rpcUrl?.startsWith('http://127.0.0.1') || config.bitcoin?.rpcUrl?.startsWith('http://localhost')) && config.bitcoin?.secretRef),
    counterparty_api: Boolean(config.counterparty?.enabled && httpsUrl(config.counterparty?.apiUrl)),
    mining_pool: Boolean(config.pool?.enabled && config.pool?.endpoint && /^stratum(\+tcp|\+ssl)?:\/\//.test(config.pool.endpoint)),
    miner_agents: Boolean(config.miners?.enabled && Number(config.miners?.verifiedAgentCount) > 0),
    fx_rates: Boolean(config.fx?.enabled && httpsUrl(config.fx?.apiUrl) && config.fx?.source),
    payment_gateway: Boolean(config.payments?.enabled && config.payments?.provider && config.payments?.secretRef),
    contract_store: Boolean(config.storage?.contracts === 'PERSISTENT'),
    settlement_store: Boolean(config.storage?.settlements === 'PERSISTENT'),
    webhook_verification: Boolean(config.payments?.webhookSignatureVerification === true),
    compliance_gate: Boolean(config.compliance?.enabled && config.compliance?.activationPolicy === 'FAIL_CLOSED')
  }
  const missing = REQUIRED_CAPABILITIES.filter(key => !checks[key])
  return {
    mode: missing.length === 0 ? 'LIVE' : 'BLOCKED',
    ready: missing.length === 0,
    checks,
    missing,
    evaluatedAt: new Date().toISOString()
  }
}

export function assertLiveContractActivation(input = {}) {
  const required = [
    input.productionReady === true,
    input.paymentConfirmed === true,
    input.contractExecuted === true,
    input.capacityBacked === true,
    input.customerSettlementDestinationVerified === true,
    input.simulation !== true
  ]
  if (required.some(v => !v)) throw new Error('Cloud-mining contract activation blocked by production gate')
  return {
    activationId: `ACT-${crypto.randomUUID()}`,
    orderId: input.orderId,
    contractId: input.contractId,
    state: 'ACTIVE',
    activatedAt: new Date().toISOString()
  }
}

export function buildProductionHealthSnapshot({readiness, minerFleet = {}, pool = {}, payments = {}, chains = {}} = {}) {
  return {
    status: readiness?.ready ? 'OPERATIONAL' : 'BLOCKED',
    readiness,
    bitcoin: {connected: Boolean(chains.bitcoinConnected), height: chains.bitcoinHeight ?? null},
    counterparty: {connected: Boolean(chains.counterpartyConnected), serverHeight: chains.counterpartyHeight ?? null},
    miners: {verifiedAgents: Number(minerFleet.verifiedAgents || 0), hashrateTh: Number(minerFleet.hashrateTh || 0), online: Number(minerFleet.online || 0)},
    pool: {connected: Boolean(pool.connected), acceptedShares: Number(pool.acceptedShares || 0), rejectedShares: Number(pool.rejectedShares || 0)},
    payments: {provider: payments.provider || null, enabledCurrencies: payments.enabledCurrencies || [], webhookVerified: Boolean(payments.webhookVerified)},
    generatedAt: new Date().toISOString()
  }
}
