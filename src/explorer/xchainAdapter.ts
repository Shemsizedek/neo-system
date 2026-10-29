/** XChain Platform testnet data is distinct from Counterparty mainnet assets. */
export const XCHAIN_NETWORKS = ['TBTC', 'TLTC', 'TDOGE'] as const
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
    if (!XCHAIN_NETWORKS.includes(network)) throw new Error('Only XChain testnets are enabled.')
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
    if (!body || typeof body !== 'object' || !('data' in body) || body.data == null) throw new Error('Invalid XChain response.')
    const envelope = body as {data: unknown; freshness?: {stale?: boolean}}
    const marker = response.headers.get('XChain-Freshness')
    let freshness: XChainResult['freshness'] = envelope.freshness?.stale || marker === 'stale' ? 'stale' : marker === 'live' ? 'live' : 'unknown'
    if (resource === 'status') {
      const status = envelope.data as {stale?: Record<string, unknown>; replica_halted?: Record<string, unknown>; available?: Record<string, unknown>}
      if (!status || typeof status !== 'object') throw new Error('Invalid XChain status.')
      freshness = status.stale?.[network] === true || status.replica_halted?.[network] === true ? 'stale'
        : status.stale?.[network] === false && status.replica_halted?.[network] === false && status.available?.[network] != null ? 'live' : 'unknown'
    }
    return {network, source, observedAt: new Date().toISOString(), freshness, data: envelope.data}
  }
}
