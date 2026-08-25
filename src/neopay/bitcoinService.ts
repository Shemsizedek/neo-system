const ESPLORA_API=String(import.meta.env.VITE_NEOPAY_BITCOIN_API||'https://blockstream.info/api').replace(/\/$/,'')

async function getJson<T>(path:string):Promise<T>{
  const controller=new AbortController()
  const timeout=window.setTimeout(()=>controller.abort(),12000)
  try{
    const res=await fetch(`${ESPLORA_API}${path}`,{headers:{Accept:'application/json'},signal:controller.signal})
    if(!res.ok) throw new Error(`Bitcoin API returned ${res.status}`)
    return await res.json() as T
  }finally{window.clearTimeout(timeout)}
}

export type BitcoinAddressSummary={confirmed:number;unconfirmed:number;total:number;txCount:number}
export async function getBitcoinAddressSummary(address:string):Promise<BitcoinAddressSummary>{
  const data:any=await getJson(`/address/${encodeURIComponent(address)}`)
  const chain=data?.chain_stats||{},mempool=data?.mempool_stats||{}
  const confirmed=Number(chain.funded_txo_sum||0)-Number(chain.spent_txo_sum||0)
  const unconfirmed=Number(mempool.funded_txo_sum||0)-Number(mempool.spent_txo_sum||0)
  return{confirmed,unconfirmed,total:confirmed+unconfirmed,txCount:Number(chain.tx_count||0)+Number(mempool.tx_count||0)}
}
export async function getBitcoinUtxos(address:string){return getJson<any[]>(`/address/${encodeURIComponent(address)}/utxo`)}
export async function getBitcoinTransactions(address:string){return getJson<any[]>(`/address/${encodeURIComponent(address)}/txs`)}
export async function getBitcoinTip(){const res=await fetch(`${ESPLORA_API}/blocks/tip/height`);if(!res.ok)throw new Error(`Bitcoin API returned ${res.status}`);return Number(await res.text())}
export async function broadcastBitcoinTransaction(hex:string){
  if(!/^[0-9a-fA-F]+$/.test(hex)||hex.length<100||hex.length%2)throw new Error('Signed transaction is invalid.')
  const res=await fetch(`${ESPLORA_API}/tx`,{method:'POST',headers:{'Content-Type':'text/plain'},body:hex})
  const text=await res.text()
  if(!res.ok)throw new Error(text||`Bitcoin broadcast failed (${res.status})`)
  return text.trim()
}
export function satsToBtc(sats:number){return sats/100_000_000}
