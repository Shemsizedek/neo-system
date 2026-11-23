/** Read-only Counterparty asset lookup. Never signs, broadcasts or estimates value. */
export type CounterpartyAssetRecord = {
  asset: string
  issuer: string | null
  description: string | null
  supply: string | null
  divisible: boolean | null
  locked: boolean | null
}
const API = 'https://api.counterparty.io:4000/v2'

export function normalizeAssetQuery(value: string): string {
  const asset = value.trim().toUpperCase()
  if (!/^[A-Z0-9._-]{1,64}$/.test(asset)) throw new Error('Use a valid Counterparty asset name (up to 64 letters or numbers).')
  return asset
}

export function parseAssetRecord(payload: unknown, expectedAsset: string): CounterpartyAssetRecord | null {
  if (!payload || typeof payload !== 'object') throw new Error('Invalid Counterparty asset response.')
  const root = payload as Record<string, unknown>
  if (!Object.prototype.hasOwnProperty.call(root, 'result')) throw new Error('Invalid Counterparty asset response.')
  const entry = Array.isArray(root.result) ? root.result[0] : root.result
  if (entry == null) return null
  if (typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Invalid Counterparty asset data.')
  const data = entry as Record<string, unknown>
  const name = typeof data.asset === 'string' ? data.asset : ''
  if (name !== expectedAsset) throw new Error('Counterparty returned a different asset.')
  const issuer = data.issuer ?? data.owner
  const quantity = data.supply_normalized ?? data.supply
  const normalizedSupply = typeof quantity === 'string' || typeof quantity === 'number' ? String(quantity) : null
  return {
    asset: name,
    issuer: typeof issuer === 'string' ? issuer : null,
    description: typeof data.description === 'string' && data.description.trim() ? data.description : null,
    supply: normalizedSupply,
    divisible: typeof data.divisible === 'boolean' ? data.divisible : null,
    locked: typeof data.locked === 'boolean' ? data.locked : null,
  }
}

export async function fetchCounterpartyAsset(
  input: string,
  signal?: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<CounterpartyAssetRecord | null> {
  const asset = normalizeAssetQuery(input)
  const url = `${API}/assets/${encodeURIComponent(asset)}`
  const timeout = AbortSignal.timeout(10000)
  const response = await fetchImpl(url, {
    method: 'GET', credentials: 'omit', redirect: 'error', cache: 'no-store',
    headers: {Accept: 'application/json'},
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error('Counterparty asset lookup unavailable (HTTP ' + response.status + ').')
  return parseAssetRecord(await response.json(), asset)
}
