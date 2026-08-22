import type { CesAdapter } from './adapter'
import type { CesCoordinatorAgent, CesExchange, CesNormalizedRecord, CesRecordKind, CesSnapshot } from './types'
import { assertNoSensitivePayload, canRead, classifyCesData } from './permissions'
import { getCoordinatorAgent, getExchange } from './registry'
import type { CesSecretProvider } from './auth'
import { cesCredentialRef } from './auth'
import type { CesCoordinatorBrowser, CesRawRecord } from './session'

export type CesWorkerRun = {
  snapshot: CesSnapshot
  startedAt: string
  finishedAt: string
  recordsPublished: number
}

export type CesRecordSink = {
  publish(records: CesNormalizedRecord[]): Promise<number>
}

export class MemoryCesRecordSink implements CesRecordSink {
  readonly records: CesNormalizedRecord[] = []

  async publish(records: CesNormalizedRecord[]) {
    this.records.push(...records)
    return records.length
  }
}

export class AuthenticatedCesWorkerAdapter implements CesAdapter {
  readonly source = 'CES_LEGACY' as const

  constructor(
    private readonly secrets: CesSecretProvider,
    private readonly browser: CesCoordinatorBrowser
  ) {}

  async health() {
    return true
  }

  async getExchange(exchange: CesExchange, agent: CesCoordinatorAgent) {
    if (!canRead(agent, 'EXCHANGE')) return []
    return [this.normalize(exchange.xid, 'EXCHANGE', { ...exchange })]
  }

  async getRecords(exchange: CesExchange, agent: CesCoordinatorAgent, kinds: CesRecordKind[]) {
    const permitted = kinds.filter((kind) => canRead(agent, kind))
    if (permitted.length === 0) return []

    const credentials = await this.secrets.get(cesCredentialRef(exchange.xid))
    const session = await this.browser.login(exchange, credentials)

    try {
      const raw = await this.browser.collect(session, exchange, permitted)
      return raw.map((record) => this.normalizeRaw(exchange.xid, record))
    } finally {
      await session.close()
    }
  }

  private normalizeRaw(exchangeId: string, record: CesRawRecord): CesNormalizedRecord {
    return this.normalize(exchangeId, record.kind, record.payload)
  }

  private normalize(exchangeId: string, kind: CesRecordKind, payload: Record<string, unknown>): CesNormalizedRecord {
    assertNoSensitivePayload(payload)
    const observedAt = new Date().toISOString()
    return {
      id: `${exchangeId}:${kind}:${observedAt}:${crypto.randomUUID()}`,
      exchangeId,
      kind,
      dataClass: classifyCesData(kind),
      source: this.source,
      observedAt,
      payload
    }
  }
}

export async function runCesCoordinatorWorker(
  xid: string,
  adapter: CesAdapter,
  sink: CesRecordSink,
  kinds: CesRecordKind[] = ['EXCHANGE', 'OFFER', 'WANT', 'BALANCE', 'ACTIVITY', 'TRANSACTION']
): Promise<CesWorkerRun> {
  const startedAt = new Date().toISOString()
  const exchange = getExchange(xid)
  const agent = getCoordinatorAgent(xid)
  if (!exchange || !agent) throw new Error(`CES exchange is not registered: ${xid}`)

  const permitted = kinds.filter((kind) => canRead(agent, kind))
  const metadata = permitted.includes('EXCHANGE') ? await adapter.getExchange(exchange, agent) : []
  const records = await adapter.getRecords(exchange, agent, permitted.filter((kind) => kind !== 'EXCHANGE'))
  const normalized = [...metadata, ...records]
  const recordsPublished = await sink.publish(normalized)
  const finishedAt = new Date().toISOString()

  return {
    snapshot: { exchange, records: normalized, audit: [] },
    startedAt,
    finishedAt,
    recordsPublished
  }
}
