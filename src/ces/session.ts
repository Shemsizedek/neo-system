import type { CesCredentials } from './auth'
import type { CesExchange, CesRecordKind } from './types'

export type CesSession = {
  exchangeId: string
  authenticatedAt: string
  expiresAt?: string
  close(): Promise<void>
}

export type CesRawRecord = {
  kind: CesRecordKind
  payload: Record<string, unknown>
}

export interface CesCoordinatorBrowser {
  login(exchange: CesExchange, credentials: CesCredentials): Promise<CesSession>
  collect(session: CesSession, exchange: CesExchange, kinds: CesRecordKind[]): Promise<CesRawRecord[]>
}

export class DisabledCesCoordinatorBrowser implements CesCoordinatorBrowser {
  async login(): Promise<CesSession> {
    throw new Error('CES coordinator browser automation is not configured')
  }

  async collect(): Promise<CesRawRecord[]> {
    return []
  }
}
