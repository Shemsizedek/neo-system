import{routedFetch}from'./routerClient'
import{clearPendingTransactionReview,registerBroadcastReceipt}from'./receiptCenter'

async function getJson<T>(path:string):Promise<T>{
  const{res}=await routedFetch('btc.read',path,{headers:{Accept:'application/json'}})
  if(!res.ok)throw new Error(`Bitcoin API returned ${res.status}`)
  return await res.json() as T
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
export async function getBitcoinTip(){const{res}=await routedFetch('btc.read','/blocks/tip/height');if(!res.ok)throw new Error(`Bitcoin API returned ${res.status}`);return Number(await res.text())}
export async function getBitcoinTransactionStatus(txid:string){
 if(!/^[0-9a-fA-F]{64}$/.test(txid))throw new Error('Bitcoin transaction ID is invalid.')
 const[status,tip]=await Promise.all([getJson<any>(`/tx/${txid}/status`),getBitcoinTip().catch(()=>0)])
 const confirmed=Boolean(status?.confirmed),blockHeight=confirmed?Number(status?.block_height||0):undefined
 const confirmations=confirmed&&blockHeight&&tip>=blockHeight?tip-blockHeight+1:confirmed?1:0
 return{confirmed,blockHeight,confirmations,blockHash:status?.block_hash as string|undefined,blockTime:status?.block_time as number|undefined}
}
export async function broadcastBitcoinTransaction(hex:string){
  if(!/^[0-9a-fA-F]+$/.test(hex)||hex.length<100||hex.length%2)throw new Error('Signed transaction is invalid.')
  try{
    const{res}=await routedFetch('btc.broadcast','/tx',{method:'POST',headers:{'Content-Type':'text/plain'},body:hex})
    const text=await res.text()
    if(!res.ok)throw new Error(text||`Bitcoin broadcast failed (${res.status})`)
    const txid=text.trim()
    if(!/^[0-9a-fA-F]{64}$/.test(txid))throw new Error('Bitcoin provider returned an invalid transaction ID.')
    registerBroadcastReceipt(txid)
    return txid
  }catch(e){clearPendingTransactionReview();throw e}
}
export function satsToBtc(sats:number){return sats/100_000_000}
