export const COUNTERPARTY_API = 'https://api.counterparty.io:4000/v2'

export type ApiState = 'ONLINE' | 'DEGRADED' | 'OFFLINE'

async function request<T>(path: string): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), 15000)
  try {
    const res = await fetch(`${COUNTERPARTY_API}${path}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Counterparty API returned ${res.status}`)
    return await res.json() as T
  } finally {
    window.clearTimeout(timeout)
  }
}

export function isLikelyBitcoinAddress(address: string) {
  return /^(1|3|bc1)[A-Za-z0-9]{20,90}$/.test(address.trim())
}

export async function getAddressBalances(address: string) {
  if (!isLikelyBitcoinAddress(address)) throw new Error('Enter a valid Bitcoin/Counterparty address.')
  return request<any>(`/addresses/${encodeURIComponent(address)}/balances`)
}

export async function getAddressTransactions(address: string) {
  if (!isLikelyBitcoinAddress(address)) throw new Error('Enter a valid Bitcoin/Counterparty address.')
  return request<any>(`/addresses/${encodeURIComponent(address)}/transactions`)
}

export async function getAsset(asset: string) {
  if (!/^[A-Z0-9._-]{1,64}$/i.test(asset.trim())) throw new Error('Enter a valid Counterparty asset name.')
  return request<any>(`/assets/${encodeURIComponent(asset.trim().toUpperCase())}`)
}

export async function getOrders(baseAsset = 'NOMNI', quoteAsset = 'XCP') {
  const data = await request<any>('/orders?status=open&limit=1000')
  const rows = data?.result ?? data ?? []
  return Array.isArray(rows) ? rows.filter((o:any) => {
    const give = String(o.give_asset || '').toUpperCase()
    const get = String(o.get_asset || '').toUpperCase()
    return (give===baseAsset && get===quoteAsset) || (give===quoteAsset && get===baseAsset)
  }) : []
}

export async function getUserOrders(address: string) {
  if (!isLikelyBitcoinAddress(address)) throw new Error('Enter a valid Bitcoin/Counterparty address.')
  const data = await request<any>(`/orders?source=${encodeURIComponent(address)}&limit=1000`)
  return data?.result ?? data ?? []
}

export async function getOrderMatches(baseAsset = 'NOMNI', quoteAsset = 'XCP') {
  const data = await request<any>('/order_matches?limit=200')
  const rows = data?.result ?? data ?? []
  return Array.isArray(rows) ? rows.filter((m:any) => {
    const forward = String(m.forward_asset || '').toUpperCase()
    const backward = String(m.backward_asset || '').toUpperCase()
    return (forward===baseAsset && backward===quoteAsset) || (forward===quoteAsset && backward===baseAsset)
  }) : []
}

export async function getBlocks() {
  return request<any>('/blocks?limit=10')
}

export async function getDispensers(asset = 'NOMNI') {
  const data = await request<any>(`/dispensers?asset=${encodeURIComponent(asset)}&limit=200`)
  return data?.result ?? data ?? []
}
