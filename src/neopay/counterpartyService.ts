import{routedFetch}from'./routerClient'

async function request<T>(path:string,init?:RequestInit,capability:'counterparty.read'|'counterparty.compose'='counterparty.read'):Promise<T>{
  const headers:Record<string,string>={Accept:'application/json'}
  if(init?.body)headers['Content-Type']='application/json'
  const{res}=await routedFetch(capability,path,{...init,headers:{...headers,...(init?.headers||{})}})
  const text=await res.text();let body:any={}
  try{body=text?JSON.parse(text):{}}catch{body={message:text}}
  if(!res.ok)throw new Error(body?.error||body?.message||`Counterparty API returned ${res.status}`)
  return body as T
}

export function isLikelyBitcoinAddress(address:string){return /^(1|3|bc1)[A-Za-z0-9]{20,90}$/.test(address.trim())}
export async function getApiHealth(){return request<any>('/v2/')}
export async function getAddressBalances(address:string){if(!isLikelyBitcoinAddress(address))throw new Error('Enter a valid Bitcoin address.');return request<any>(`/v2/addresses/${encodeURIComponent(address)}/balances`)}
export async function getAddressTransactions(address:string){if(!isLikelyBitcoinAddress(address))throw new Error('Enter a valid Bitcoin address.');return request<any>(`/v2/addresses/${encodeURIComponent(address)}/transactions`)}
export async function getAddressAssetsIssued(address:string){if(!isLikelyBitcoinAddress(address))throw new Error('Enter a valid Bitcoin address.');const data=await request<any>(`/v2/addresses/${encodeURIComponent(address)}/assets/issued?limit=1000`);return data?.result??data??[]}
export async function getAsset(asset:string){if(!/^[A-Z0-9._-]{1,64}$/i.test(asset.trim()))throw new Error('Enter a valid asset name.');return request<any>(`/v2/assets/${encodeURIComponent(asset.trim().toUpperCase())}`)}
export async function getOrders(baseAsset='NOMNI',quoteAsset='XCP'){const data=await request<any>(`/v2/orders/${encodeURIComponent(baseAsset)}/${encodeURIComponent(quoteAsset)}?status=open&limit=1000`);return data?.result??data??[]}
export async function getUserOrders(address:string){if(!isLikelyBitcoinAddress(address))throw new Error('Enter a valid Bitcoin address.');const data=await request<any>(`/v2/orders?source=${encodeURIComponent(address)}&limit=1000`);return data?.result??data??[]}
export async function getOrderMatches(baseAsset='NOMNI',quoteAsset='XCP'){const data=await request<any>(`/v2/orders/${encodeURIComponent(baseAsset)}/${encodeURIComponent(quoteAsset)}/matches?limit=200`);return data?.result??data??[]}
export async function getDispensers(asset?:string){const q=asset?`?asset=${encodeURIComponent(asset)}&status=0&limit=500`:'?status=0&limit=500';const data=await request<any>(`/v2/dispensers${q}`);return data?.result??data??[]}
export async function getSends(address?:string){const q=address?`?source=${encodeURIComponent(address)}&limit=200`:'?limit=200';const data=await request<any>(`/v2/sends${q}`);return data?.result??data??[]}
export async function getIssuances(asset?:string){const q=asset?`?asset=${encodeURIComponent(asset)}&limit=200`:'?limit=200';const data=await request<any>(`/v2/issuances${q}`);return data?.result??data??[]}
export async function getBroadcasts(address?:string){const q=address?`?source=${encodeURIComponent(address)}&limit=200`:'?limit=200';const data=await request<any>(`/v2/broadcasts${q}`);return data?.result??data??[]}

const COMPOSE_ACTIONS=new Set(['send','order','cancel','issuance','dispenser','dividend','broadcast','destroy','sweep','mpma','dispense','fairminter','fairmint','pooldeposit','poolwithdraw','attach'])
export async function composeCounterparty(source:string,action:string,params:Record<string,string|number|boolean|undefined>){
  if(!isLikelyBitcoinAddress(source))throw new Error('Enter a valid source address.')
  if(!COMPOSE_ACTIONS.has(action))throw new Error('Unsupported transaction type.')
  const qs=new URLSearchParams()
  Object.entries(params).forEach(([k,v])=>{if(v!==undefined)qs.set(k,String(v))})
  qs.set('verbose','true')
  return request<any>(`/v2/addresses/${encodeURIComponent(source)}/compose/${action}?${qs.toString()}`,undefined,'counterparty.compose')
}
export type ComposeOrderInput={source:string;give_asset:'NOMNI'|'XCP';give_quantity:number;get_asset:'NOMNI'|'XCP';get_quantity:number;expiration?:number;sat_per_vbyte?:number}
export async function composeOrder(input:ComposeOrderInput){const{source,...params}=input;return composeCounterparty(source,'order',{...params,expiration:input.expiration??8064,sat_per_vbyte:input.sat_per_vbyte??3})}
export async function composeSend(input:{source:string;destination:string;asset:string;quantity:number;sat_per_vbyte?:number}){const{source,...params}=input;return composeCounterparty(source,'send',{...params,sat_per_vbyte:input.sat_per_vbyte??3})}

export async function broadcastSignedTransaction(signed_tx_hex:string){
  if(!/^[0-9a-fA-F]+$/.test(signed_tx_hex)||signed_tx_hex.length<100||signed_tx_hex.length%2)throw new Error('Signed transaction is invalid.')
  throw new Error('Use the Bitcoin broadcast path after local signing.')
}
