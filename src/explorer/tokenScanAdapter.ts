import type {MarketAdapter,MarketQuote} from './marketAdapters'
import type {CounterpartyIssuance} from './counterpartyAdapter'

export type TokenScanOrderBook={asks?:Array<[string|number,string|number]>;bids?:Array<[string|number,string|number]>}
export type TokenScanMarket={
  name?:string
  longname?:string
  price?:{ask?:string|number;bid?:string|number;last?:string|number}
  '24hour'?:{high?:string|number;low?:string|number;percent?:string|number;volume?:string}
  updated?:number|string
}

type FetchLike=(input:RequestInfo|URL,init?:RequestInit)=>Promise<Response>

const asNumber=(value:unknown)=>{
  if(typeof value==='number')return Number.isFinite(value)?value:undefined
  if(typeof value==='string'&&value.trim()!==''){
    const n=Number(value)
    return Number.isFinite(n)?n:undefined
  }
  return undefined
}

const unwrap=(body:unknown)=>{
  if(body&&typeof body==='object'&&'data' in body)return (body as {data?:unknown}).data
  return body
}

const volumeFromPair=(value?:string)=>{
  if(!value)return undefined
  const first=value.split('|')[0]
  return asNumber(first)
}

export class TokenScanMarketAdapter implements MarketAdapter{
  readonly venue='EXTERNAL' as const
  constructor(private readonly apiBase='https://tokenscan.io/api',private readonly fetchImpl:FetchLike=fetch){}

  private async get(path:string){
    const response=await this.fetchImpl(`${this.apiBase}${path}`,{headers:{accept:'application/json'}})
    if(!response.ok)throw new Error(`TokenScan API ${response.status}: ${path}`)
    return response.json() as Promise<unknown>
  }

  async getMarket(pair:string):Promise<TokenScanMarket|null>{
    const [base,quote]=pair.split('/')
    if(!base||!quote)return null
    try{
      const body=await this.get(`/market/${encodeURIComponent(base)}/${encodeURIComponent(quote)}`)
      const result=unwrap(body)
      return result&&typeof result==='object'?result as TokenScanMarket:null
    }catch{return null}
  }

  async getOrderBook(pair:string):Promise<TokenScanOrderBook|null>{
    const [base,quote]=pair.split('/')
    if(!base||!quote)return null
    try{
      const body=await this.get(`/market/${encodeURIComponent(base)}/${encodeURIComponent(quote)}/orderbook`)
      const result=unwrap(body)
      return result&&typeof result==='object'?result as TokenScanOrderBook:null
    }catch{return null}
  }

  async getIssuances(address:string):Promise<CounterpartyIssuance[]>{
    try{
      const body=await this.get(`/issuances/${encodeURIComponent(address)}`)
      const result=unwrap(body)
      return Array.isArray(result)?result as CounterpartyIssuance[]:[]
    }catch{return []}
  }

  async getQuote(pair:string):Promise<MarketQuote|null>{
    const market=await this.getMarket(pair)
    if(!market)return null
    const bid=asNumber(market.price?.bid)
    const ask=asNumber(market.price?.ask)
    const last=asNumber(market.price?.last)
    const volume24h=volumeFromPair(market['24hour']?.volume)
    if(bid==null&&ask==null&&last==null)return null
    const updated=asNumber(market.updated)
    return {
      venue:this.venue,
      pair,
      bid,
      ask,
      last,
      volume24h,
      timestamp:updated?new Date(updated*1000).toISOString():new Date().toISOString(),
      source:`${this.apiBase}/market/${pair}`,
    }
  }
}
