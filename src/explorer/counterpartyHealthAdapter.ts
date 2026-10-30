/** Counterparty mainnet status is independent from XChain Platform testnet state. */
export type CounterpartyReadiness = 'ready' | 'lagging' | 'unknown'
export type CounterpartyHealth = {
  source: string
  observedAt: string
  network: 'bitcoin-mainnet'
  readiness: CounterpartyReadiness
  bitcoinHeight: number | null
  counterpartyHeight: number | null
  ledgerState: string | null
}

const API = 'https://api.counterparty.io:4000/v2/'
const height = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null

export class CounterpartyHealthAdapter {
  private fetchImpl: typeof fetch
  constructor(fetchImpl: typeof fetch = fetch) { this.fetchImpl = fetchImpl }

  async read(signal?: AbortSignal): Promise<CounterpartyHealth> {
    const timeout = AbortSignal.timeout(10000)
    const response = await this.fetchImpl(API, {
      method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store',
      headers: {Accept: 'application/json'},
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    })
    if (!response.ok) throw new Error('Counterparty status unavailable (HTTP ' + response.status + ').')
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object' || !('result' in body)) throw new Error('Invalid Counterparty response.')
    const result = (body as {result?: unknown}).result
    if (!result || typeof result !== 'object') throw new Error('Invalid Counterparty status.')
    const status = result as Record<string, unknown>
    if (status.network !== 'mainnet') throw new Error('Counterparty did not identify Bitcoin mainnet.')
    const bitcoinHeight = height(status.backend_height)
    const counterpartyHeight = height(status.counterparty_height)
    const ledgerState = typeof status.ledger_state === 'string' ? status.ledger_state : null
    const headerReady = response.headers.get('X-COUNTERPARTY-READY')?.toLowerCase() ?? null
    const known = typeof status.server_ready === 'boolean' && bitcoinHeight !== null && counterpartyHeight !== null && ledgerState !== null &&
      (headerReady === null || headerReady === 'true' || headerReady === 'false')
    const ready = known && status.server_ready === true && ledgerState === 'Following' &&
      counterpartyHeight! >= bitcoinHeight! - 1 && headerReady !== 'false'
    const lagging = known && (status.server_ready === false || ledgerState !== 'Following' ||
      counterpartyHeight! < bitcoinHeight! - 1 || headerReady === 'false')
    return {
      source: API, observedAt: new Date().toISOString(), network: 'bitcoin-mainnet',
      readiness: ready ? 'ready' : lagging ? 'lagging' : 'unknown',
      bitcoinHeight, counterpartyHeight, ledgerState,
    }
  }
}
