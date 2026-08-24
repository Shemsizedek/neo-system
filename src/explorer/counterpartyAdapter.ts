import type {MarketAdapter,MarketQuote} from './marketAdapters'

export type CounterpartyOrder={
  give_asset?:string
  get_asset?:string
  give_quantity_normalized?:string|number
  get_quantity_normalized?:string|number
  give_remaining_normalized?:string|number
  get_remaining_normalized?:string|number
  status?:string
}

export type CounterpartyBalance={asset:string;quantity?:number;quantity_normalized?:string|number}
export type CounterpartyHolder={address?:string;address_quantity?:number;quantity?:number;quantity_normalized?:string|number}
export type CounterpartyDispenser={asset?:string;give_quantity?:number;give_quantity_normalized?:string|number;satoshirate?:number;status?:number|string}
export type CounterpartyAssetInfo={asset?:string;asset_longname?:string;issuer?:string;owner?:string;description?:string;divisible?:boolean;locked?:boolean;supply?:number;supply_normalized?:string|number}

export type CounterpartySnapshot={
  pair:string
  quote:MarketQuote|null
  orders:CounterpartyOrder[]
  balances:CounterpartyBalance[]
  holders:CounterpartyHolder[]
  dispensers:CounterpartyDispenser[]
  assetInfo:CounterpartyAssetInfo|null
  observedAt:string
}

export type CounterpartyFetch=(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>

const asNumber=(value:unknown)=>{
  if(typeof value==='number')return Number.isFinite(value)?value:undefined
  if(typeof value==='string'&&value.trim()!==''){
    const n=Number(value)
    return Number.isFinite(n)?n:undefined
  }
  return undefined
}

export class CounterpartyV2MarketAdapter implements MarketAdapter{
  readonly venue='XCP_DEX' as const
  constructor(
    private readonly apiBase='https://api.counterparty.io:4000/v2',
    private readonly fetchImpl:CounterpartyFetch=fetch,
  ){}

  private async getResult(path:string){
    const response=await this.fetchImpl(`${this.apiBase}${path}`,{headers:{accept:'application/json'}})
    if(!response.ok)throw new Error(`Counterparty API ${response.status}: ${path}`)
    const body=await response.json() as {result?:unknown}
    return body.result
  }

  async getQuote(pair:string):Promise<MarketQuote|null>{
    const [base,quote]=pair.split('/')
    if(!base||!quote)return null
    const result=await this.getResult(`/assets/${encodeURIComponent(base)}/orders?status=open&limit=100`)
    const orders=Array.isArray(result)?result as CounterpartyOrder[]:[]
    const sells=orders.filter(o=>o.give_asset===base&&o.get_asset===quote)
    const buys=orders.filter(o=>o.give_asset===quote&&o.get_asset===base)
    const asks=sells.map(o=>{
      const give=asNumber(o.give_remaining_normalized??o.give_quantity_normalized)
      const get=asNumber(o.get_remaining_normalized??o.get_quantity_normalized)
      return give&&get?get/give:undefined
    }).filter((v):v is number=>v!=null&&v>0)
    const bids=buys.map(o=>{
      const give=asNumber(o.give_remaining_normalized??o.give_quantity_normalized)
      const get=asNumber(o.get_remaining_normalized??o.get_quantity_normalized)
      return give&&get?give/get:undefined
    }).filter((v):v is number=>v!=null&&v>0)
    if(!asks.length&&!bids.length)return null
    return {venue:this.venue,pair,bid:bids.length?Math.max(...bids):undefined,ask:asks.length?Math.min(...asks):undefined,timestamp:new Date().toISOString(),source:`${this.apiBase}/assets/${base}/orders`}
  }

  async getFoundationBalances(address:string){
    const result=await this.getResult(`/addresses/${encodeURIComponent(address)}/balances?limit=1000`)
    return Array.isArray(result)?result as CounterpartyBalance[]:[]
  }

  async getAssetInfo(asset:string){
    try{
      const result=await this.getResult(`/assets/${encodeURIComponent(asset)}`)
      if(Array.isArray(result))return (result[0]??null) as CounterpartyAssetInfo|null
      return result&&typeof result==='object'?result as CounterpartyAssetInfo:null
    }catch{return null}
  }

  async getAssetHolders(asset:string){
    const result=await this.getResult(`/assets/${encodeURIComponent(asset)}/holders?limit=1000`)
    return Array.isArray(result)?result as CounterpartyHolder[]:[]
  }

  async getAssetDispensers(asset:string){
    const result=await this.getResult(`/assets/${encodeURIComponent(asset)}/dispensers?limit=1000`)
    return Array.isArray(result)?result as CounterpartyDispenser[]:[]
  }

  async snapshot(pair:string,foundationAddress:string):Promise<CounterpartySnapshot>{
    const [base]=pair.split('/')
    const [quote,balances,holders,dispensers,assetInfo]=await Promise.all([
      this.getQuote(pair),
      this.getFoundationBalances(foundationAddress),
      this.getAssetHolders(base),
      this.getAssetDispensers(base),
      this.getAssetInfo(base),
    ])
    const ordersResult=await this.getResult(`/assets/${encodeURIComponent(base)}/orders?status=open&limit=100`)
    return {pair,quote,orders:Array.isArray(ordersResult)?ordersResult as CounterpartyOrder[]:[],balances,holders,dispensers,assetInfo,observedAt:new Date().toISOString()}
  }
}
