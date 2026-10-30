/** XChain Platform testnet data is distinct from Counterparty mainnet assets. */
export const XCHAIN_NETWORKS = ['TBTC'] as const
export type XChainNetwork = typeof XCHAIN_NETWORKS[number]
export type XChainResult = {
  network: XChainNetwork
  source: string
  observedAt: string
  freshness: 'live' | 'stale' | 'unknown'
  data: unknown
}
export class XChainExplorerAdapter {
  private fetchImpl: typeof fetch
  constructor(fetchImpl: typeof fetch = fetch) { this.fetchImpl = fetchImpl }
  async read(network: XChainNetwork, resource: 'status' | 'network' | 'tokens', query?: string, signal?: AbortSignal): Promise<XChainResult> {
    if (!XCHAIN_NETWORKS.includes(network)) throw new Error('Only Bitcoin testnet is enabled.')
    if (!['status', 'network', 'tokens'].includes(resource)) throw new Error('Unsupported XChain resource.')
    if (resource === 'tokens' && (!query || !/^[A-Za-z0-9_.-]{1,128}$/.test(query))) throw new Error('Enter a valid token ticker.')
    const path = resource === 'tokens' ? 'tokens/' + encodeURIComponent(query!) + '/token?limit=20' : resource
    const source = 'https://explorer.xchain.io/' + network + '/api/' + path
    const timeout = AbortSignal.timeout(10000)
    const response = await this.fetchImpl(source, {
      method: 'GET', credentials: 'omit', redirect: 'error',
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: {Accept: 'application/json'},
    })
    if (!response.ok) throw new Error('XChain request failed (HTTP ' + response.status + ').')
    const body: unknown = await response.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Invalid XChain response.')
    const raw = body as Record<string, unknown>
    const envelope = raw as {data?: unknown; freshness?: {stale?: boolean}}
    // Live /api/status returns its status map at the top level; some documented versions wrap it in "data".
    // Accept either shape ONLY for status. All other endpoints must keep their documented data envelope.
    const statusBody = resource === 'status' && raw.available && typeof raw.available === 'object'
      ? raw
      : resource === 'status' && envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data)
        ? envelope.data as Record<string, unknown>
        : null
    if (resource === 'status' ? !statusBody || !statusBody.available || typeof statusBody.available !== 'object'
      : envelope.data == null) throw new Error('Invalid XChain response.')
    const marker = response.headers.get('XChain-Freshness')
    let freshness: XChainResult['freshness'] = envelope.freshness?.stale || marker === 'stale' ? 'stale' : marker === 'live' ? 'live' : 'unknown'
    if (statusBody) {
      const status = statusBody as {stale?: Record<string, unknown>; replica_halted?: Record<string, unknown>; available?: Record<string, unknown>}
      freshness = status.stale?.[network] === true || status.replica_halted?.[network] === true ? 'stale'
        : status.stale?.[network] === false && status.replica_halted?.[network] === false && status.available?.[network] != null ? 'live' : 'unknown'
    }
    const data = statusBody ? Object.fromEntries(
      ['supported', 'available', 'last_block', 'stale', 'replica_halted', 'decoder_health', 'tip_age_seconds'].map(key => {
        const values = statusBody[key]
        return [key, values && typeof values === 'object' && !Array.isArray(values) ? (values as Record<string, unknown>)[network] ?? null : null]
      })
    ) : envelope.data
    return {network, source, observedAt: new Date().toISOString(), freshness, data}
  }
}
