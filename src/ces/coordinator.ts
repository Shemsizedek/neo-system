import type {
  CesAuditEvent,
  CesCoordinatorAgent,
  CesNormalizedRecord,
  CesRecordKind,
  CesSnapshot,
  NomniMetric
} from './types'
import type { CesAdapter } from './adapter'
import { getCoordinatorAgent, getExchange } from './registry'
import { canRead } from './permissions'

function audit(
  agent: CesCoordinatorAgent,
  source: CesAuditEvent['source'],
  records: number,
  status: CesAuditEvent['status'],
  message?: string
): CesAuditEvent {
  const timestamp = new Date().toISOString()
  return {
    id: `${agent.id}:${timestamp}`,
    agentId: agent.id,
    exchangeId: agent.exchangeId,
    action: 'SYNC',
    source,
    records,
    status,
    timestamp,
    message
  }
}

export async function syncCesExchange(
  xid: string,
  adapters: CesAdapter[],
  kinds: CesRecordKind[] = ['EXCHANGE', 'OFFER', 'WANT', 'BALANCE', 'ACTIVITY', 'TRANSACTION']
): Promise<CesSnapshot> {
  const exchange = getExchange(xid)
  const agent = getCoordinatorAgent(xid)

  if (!exchange || !agent) throw new Error(`CES exchange is not registered: ${xid}`)

  const permittedKinds = kinds.filter((kind) => canRead(agent, kind))
  const auditLog: CesAuditEvent[] = []

  for (const adapter of adapters) {
    if (!agent.sourcePreference.includes(adapter.source)) continue

    try {
      if (!(await adapter.health())) {
        auditLog.push(audit(agent, adapter.source, 0, 'ERROR', 'Adapter health check unavailable'))
        continue
      }

      const metadata = permittedKinds.includes('EXCHANGE')
        ? await adapter.getExchange(exchange, agent)
        : []
      const requested = permittedKinds.filter((kind) => kind !== 'EXCHANGE')
      const records = [...metadata, ...(await adapter.getRecords(exchange, agent, requested))]

      auditLog.push(audit(agent, adapter.source, records.length, 'SUCCESS'))
      return { exchange, records, audit: auditLog }
    } catch (error) {
      auditLog.push(
        audit(
          agent,
          adapter.source,
          0,
          'ERROR',
          error instanceof Error ? error.message : 'Unknown CES adapter error'
        )
      )
    }
  }

  return { exchange, records: [], audit: auditLog }
}

export function calculateNomniMetrics(records: CesNormalizedRecord[]): NomniMetric[] {
  const calculatedAt = new Date().toISOString()
  const count = (kind: CesRecordKind) => records.filter((record) => record.kind === kind).length

  return [
    {
      key: 'exchange_records',
      label: 'Observed Exchange Records',
      value: count('EXCHANGE'),
      unit: 'records',
      methodology: 'Count of source-observed exchange metadata records in the current normalized dataset.',
      sourceRecordKinds: ['EXCHANGE'],
      derived: true,
      calculatedAt
    },
    {
      key: 'market_listings',
      label: 'Observed Market Listings',
      value: count('OFFER') + count('WANT'),
      unit: 'records',
      methodology: 'Count of normalized CES offers plus wants. This is activity metadata, not a valuation or liquidity claim.',
      sourceRecordKinds: ['OFFER', 'WANT'],
      derived: true,
      calculatedAt
    },
    {
      key: 'observed_transactions',
      label: 'Observed Transactions',
      value: count('TRANSACTION'),
      unit: 'records',
      methodology: 'Count of authorized normalized transaction records. It does not infer fiat value, market capitalization, or investment liquidity.',
      sourceRecordKinds: ['TRANSACTION'],
      derived: true,
      calculatedAt
    }
  ]
}
