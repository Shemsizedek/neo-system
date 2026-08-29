import type { CesAdapter } from './adapter'
import type { CesCoordinatorAgent, CesExchange, CesNormalizedRecord, CesRecordKind, CesSourceKind } from './types'

export type CesApiTransport = {
  get(path: string, token?: string): Promise<unknown>
}

export class Ces2ApiReadAdapter implements CesAdapter {
  readonly source: CesSourceKind = 'CES2'

  constructor(private readonly transport: CesApiTransport) {}

  async health() {
    try {
      await this.transport.get('/health')
      return true
    } catch {
      return false
    }
  }

  async getExchange(_exchange: CesExchange, _agent: CesCoordinatorAgent): Promise<CesNormalizedRecord[]> {
    return []
  }

  async getRecords(
    _exchange: CesExchange,
    _agent: CesCoordinatorAgent,
    _kinds: CesRecordKind[]
  ): Promise<CesNormalizedRecord[]> {
    // Intentionally empty until CES2 publishes/stabilizes the authorized API contract.
    return []
  }
}
