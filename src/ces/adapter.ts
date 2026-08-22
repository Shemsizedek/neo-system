import type {
  CesCoordinatorAgent,
  CesExchange,
  CesNormalizedRecord,
  CesRecordKind,
  CesSourceKind
} from './types'
import { assertNoSensitivePayload, canRead, classifyCesData } from './permissions'

export interface CesAdapter {
  readonly source: CesSourceKind
  health(): Promise<boolean>
  getExchange(exchange: CesExchange, agent: CesCoordinatorAgent): Promise<CesNormalizedRecord[]>
  getRecords(
    exchange: CesExchange,
    agent: CesCoordinatorAgent,
    kinds: CesRecordKind[]
  ): Promise<CesNormalizedRecord[]>
}

export type CesFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>

export class LegacyCesReadOnlyAdapter implements CesAdapter {
  readonly source: CesSourceKind = 'CES_LEGACY'

  constructor(private readonly fetchImpl: CesFetch = fetch) {}

  async health() {
    try {
      const response = await this.fetchImpl('https://www.community-exchange.org/', {
        method: 'GET',
        credentials: 'omit'
      })
      return response.ok
    } catch {
      return false
    }
  }

  async getExchange(exchange: CesExchange, agent: CesCoordinatorAgent) {
    if (!canRead(agent, 'EXCHANGE')) return []

    return [
      this.normalize(exchange.xid, 'EXCHANGE', {
        xid: exchange.xid,
        name: exchange.name,
        networkId: exchange.networkId,
        serverId: exchange.serverId,
        serverUrl: exchange.serverUrl,
        currencyName: exchange.currencyName,
        currencyPlural: exchange.currencyPlural,
        symbol: exchange.symbol,
        exchangeType: exchange.exchangeType,
        linkedExchanges: exchange.linkedExchanges
      })
    ]
  }

  async getRecords(
    _exchange: CesExchange,
    _agent: CesCoordinatorAgent,
    _kinds: CesRecordKind[]
  ): Promise<CesNormalizedRecord[]> {
    // Legacy CES page automation is intentionally not implemented here.
    // Production collection must use an authorized endpoint or an approved
    // browser worker bound to a coordinator-owned account and explicit policy.
    return []
  }

  protected normalize(exchangeId: string, kind: CesRecordKind, payload: Record<string, unknown>) {
    assertNoSensitivePayload(payload)
    const observedAt = new Date().toISOString()

    return {
      id: `${exchangeId}:${kind}:${observedAt}`,
      exchangeId,
      kind,
      dataClass: classifyCesData(kind),
      source: this.source,
      observedAt,
      payload
    } satisfies CesNormalizedRecord
  }
}

export class Ces2Adapter extends LegacyCesReadOnlyAdapter {
  readonly source: CesSourceKind = 'CES2'

  async health() {
    return false
  }
}

export class CenFederationAdapter extends LegacyCesReadOnlyAdapter {
  readonly source: CesSourceKind = 'CEN_FEDERATION'

  async health() {
    return false
  }
}
