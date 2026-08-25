export const NEOPAY_API = String(import.meta.env.VITE_NEOPAY_API_BASE || '').replace(/\/$/,'')

function requireGateway(){
  if(!NEOPAY_API) throw new Error('NEOpay backend is not configured. Set VITE_NEOPAY_API_BASE for production.')
  return NEOPAY_API
}

async function request<T>(path:string,init?:RequestInit):Promise<T>{
  const controller=new AbortController()
  const timeout=window.setTimeout(()=>controller.abort(),15000)
  try{
    const res=await fetch(`${requireGateway()}${path}`,{...init,headers:{Accept:'application/json','Content-Type':'application/json',...(init?.headers||{})},signal:controller.signal})
    const body=await res.json().catch(()=>({}))
    if(!res.ok) throw new Error(body?.error||`NEOpay API returned ${res.status}`)
    return body as T
  }finally{window.clearTimeout(timeout)}
}

export function isLikelyBitcoinAddress(address:string){return /^(1|3|bc1)[A-Za-z0-9]{20,90}$/.test(address.trim())}
export async function getApiHealth(){return request<any>('/health')}
export async function getAddressBalances(address:string){if(!isLikelyBitcoinAddress(address))throw new Error('Enter a valid Bitcoin/Counterparty address.');return request<any>(`/v2/addresses/${encodeURIComponent(address)}/balances`)}
export async function getAddressTransactions(address:string){if(!isLikelyBitcoinAddress(address))throw new Error('Enter a valid Bitcoin/Counterparty address.');return request<any>(`/v2/addresses/${encodeURIComponent(address)}/transactions`)}
export async function getAsset(asset:string){if(!/^[A-Z0-9._-]{1,64}$/i.test(asset.trim()))throw new Error('Enter a valid Counterparty asset name.');return request<any>(`/v2/assets/${encodeURIComponent(asset.trim().toUpperCase())}`)}
export async function getOrders(baseAsset='NOMNI',quoteAsset='XCP'){const data=await request<any>('/v2/orders?status=open&limit=1000');const rows=data?.result??data??[];return Array.isArray(rows)?rows.filter((o:any)=>{const give=String(o.give_asset||'').toUpperCase(),get=String(o.get_asset||'').toUpperCase();return(give===baseAsset&&get===quoteAsset)||(give===quoteAsset&&get===baseAsset)}):[]}
export async function getUserOrders(address:string){if(!isLikelyBitcoinAddress(address))throw new Error('Enter a valid Bitcoin/Counterparty address.');const data=await request<any>(`/v2/orders?source=${encodeURIComponent(address)}&limit=1000`);return data?.result??data??[]}
export async function getOrderMatches(baseAsset='NOMNI',quoteAsset='XCP'){const data=await request<any>('/v2/order_matches?limit=200');const rows=data?.result??data??[];return Array.isArray(rows)?rows.filter((m:any)=>{const forward=String(m.forward_asset||'').toUpperCase(),backward=String(m.backward_asset||'').toUpperCase();return(forward===baseAsset&&backward===quoteAsset)||(forward===quoteAsset&&backward===baseAsset)}):[]}

export type ComposeOrderInput={source:string;give_asset:'NOMNI'|'XCP';give_quantity:number;get_asset:'NOMNI'|'XCP';get_quantity:number;expiration?:number}
export async function composeOrder(input:ComposeOrderInput){return request<any>('/v2/compose/order',{method:'POST',body:JSON.stringify(input)})}
export async function broadcastSignedTransaction(signed_tx_hex:string){if(!/^[0-9a-fA-F]+$/.test(signed_tx_hex)||signed_tx_hex.length<100)throw new Error('Signed transaction hex is invalid.');return request<any>('/v2/broadcast',{method:'POST',body:JSON.stringify({signed_tx_hex})})}
