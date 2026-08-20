export const COUNTERPARTY_API = 'https://api.counterparty.io:4000/v2'
export const NOMNI_ASSET = 'NOMNI'
export const NOMNI_TREASURY = '18FyntJG9hdXYvanm67mGgbyo1P7adckvg'
export const NOMNI_ICON = 'https://coindaddy.io/content/images/icons/xcp/NOMNI.png'

export type Balance = { asset: string; quantity: number | string }
export type AssetInfo = Record<string, unknown> & { asset?: string; supply?: number | string; issuer?: string; divisible?: boolean; description?: string }
export type CounterpartyTx = Record<string, unknown> & {
  tx_hash?: string
  block_index?: number
  block_time?: number
  source?: string
  destination?: string | null
  btc_amount?: number
  fee?: number
  transaction_type?: string
  valid?: number | boolean
}
export type Order = Record<string, unknown> & {
  tx_hash?: string
  source?: string
  give_asset?: string
  get_asset?: string
  give_quantity?: number
  get_quantity?: number
  give_remaining?: number
  get_remaining?: number
  status?: string
}

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${COUNTERPARTY_API}${path}`)
  if (!response.ok) throw new Error(`Counterparty API ${response.status}: ${response.statusText}`)
  const payload = await response.json()
  return (payload?.result ?? payload) as T
}

export const displayAsset = (asset?: string) => asset === 'XCP' ? 'NEO (XCP)' : (asset || '—')

export async function getAddressBalances(address: string) {
  return request<Balance[]>(`/addresses/${encodeURIComponent(address)}/balances`)
}

export async function getAddressTransactions(address: string) {
  return request<CounterpartyTx[]>(`/addresses/${encodeURIComponent(address)}/transactions`)
}

export async function getAsset(asset: string) {
  return request<AssetInfo>(`/assets/${encodeURIComponent(asset.toUpperCase())}`)
}

export async function getOrders(giveAsset: string, getAssetName: string) {
  const give = encodeURIComponent(giveAsset.toUpperCase())
  const get = encodeURIComponent(getAssetName.toUpperCase())
  return request<Order[]>(`/orders?give_asset=${give}&get_asset=${get}`)
}

export async function getUserOrders(address: string) {
  return request<Order[]>(`/orders?source=${encodeURIComponent(address)}`)
}

export async function getBlocks(limit = 10) {
  return request<Record<string, unknown>[]>(`/blocks?limit=${limit}`)
}
