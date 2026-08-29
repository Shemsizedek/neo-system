import type { CesBrowserDriver } from './browserDriver'
import { EnvCesSecretProvider } from './auth'
import { AuthenticatedCesWorkerAdapter, MemoryCesRecordSink, runCesCoordinatorWorker } from './worker'
import { LiveLegacyCesCoordinatorBrowser } from './liveBrowser'
import { defaultCesCollectionPolicy } from './collectionPolicy'
import { buildNomniMarketPacket, type NomniMarketPacket } from './publisher'
import { selectorsFromEnv } from './selectorConfig'
import type { CesRecordKind } from './types'

export type NmniPilotMode = 'DRY_RUN' | 'AUTHORIZED_READ'

export type NmniPilotOptions = {
  mode?: NmniPilotMode
  driverFactory: () => Promise<CesBrowserDriver>
  kinds?: CesRecordKind[]
  maxRowsPerKind?: number
}

export type NmniPilotResult = {
  mode: NmniPilotMode
  authenticatedCollectionEnabled: boolean
  selectorsConfigured: boolean
  recordsPublished: number
  marketPacket: NomniMarketPacket | null
  notes: string[]
}

const DEFAULT_KINDS: CesRecordKind[] = ['EXCHANGE', 'OFFER', 'WANT', 'BALANCE', 'ACTIVITY', 'TRANSACTION']

export async function runNmniCoordinatorPilot(options: NmniPilotOptions): Promise<NmniPilotResult> {
  const mode = options.mode ?? 'DRY_RUN'
  const selectors = selectorsFromEnv()
  const notes: string[] = []

  if (mode === 'DRY_RUN') {
    notes.push('Dry run does not request CES credentials, create a login session, or collect authenticated data.')
    notes.push(selectors ? 'Verified selector configuration is present.' : 'Verified selector configuration is not present yet.')
    return {
      mode,
      authenticatedCollectionEnabled: false,
      selectorsConfigured: Boolean(selectors),
      recordsPublished: 0,
      marketPacket: null,
      notes
    }
  }

  if (!selectors) {
    throw new Error('NMNI authorized-read pilot requires verified selector environment variables')
  }

  const policy = {
    ...defaultCesCollectionPolicy,
    allowAuthorizedRawText: true,
    maxRowsPerKind: Math.min(Math.max(options.maxRowsPerKind ?? 250, 1), 1_000)
  }

  const browser = new LiveLegacyCesCoordinatorBrowser(options.driverFactory, {
    selectors,
    collectionPolicy: policy,
    maxRetries: 1
  })
  const adapter = new AuthenticatedCesWorkerAdapter(new EnvCesSecretProvider(), browser)
  const sink = new MemoryCesRecordSink()
  const run = await runCesCoordinatorWorker('NMNI', adapter, sink, options.kinds ?? DEFAULT_KINDS)
  const marketPacket = buildNomniMarketPacket('NMNI', run.snapshot.records)

  notes.push('Authorized read pilot completed with transaction/member writes disabled.')
  notes.push('Raw CES records remain source observations; NOMNI metrics are derived separately in the market packet.')

  return {
    mode,
    authenticatedCollectionEnabled: true,
    selectorsConfigured: true,
    recordsPublished: run.recordsPublished,
    marketPacket,
    notes
  }
}
