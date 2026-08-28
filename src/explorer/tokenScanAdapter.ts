import type {MarketAdapter,MarketQuote} from './marketAdapters'

export type TokenScanOrderLevel={price?:string|number;amount?:string|number;quantity?:string|number;total?:string|number}
export type TokenScanOrderBook={asks?:TokenScanOrderLevel[];bids?:TokenScanOrderLevel[]}
export type TokenScanMarketHistory={price?:string|number;amount?:string|number;timestamp?:number|string;type?:string}

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

export class TokenScanMarketAdapter implements MarketAdapter{
  readonly venue='EXTERNAL' as const
  constructor(private readonly apiBase='https://tokenscan.io/api',private readonly fetchImpl:FetchLike=fetch){}

  private async get(path:string){
    const response=await this.fetchImpl(`${this.apiBase}${path}`,{headers:{accept:'application/json'}})
    if(!response.ok)throw new Error(`TokenScan API ${response.status}: ${path}`)
    return response.json() as Promise<unknown>
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

  async getHistory(pair:string):Promise<TokenScanMarketHistory[]>{
    const [base,quote]=pair.split('/')
    if(!base||!quote)return []
    try{
      const body=await this.get(`/market/${encodeURIComponent(base)}/${encodeURIComponent(quote)}/history/1/100`)
      const result=unwrap(body)
      return Array.isArray(result)?result as TokenScanMarketHistory[]:[]
    }catch{return []}
  }

  async getQuote(pair:string):Promise<MarketQuote|null>{
    const [book,history]=await Promise.all([this.getOrderBook(pair),this.getHistory(pair)])
    const asks=(book?.asks??[]).map(level=>asNumber(level.price)).filter((value):value is number=>value!=null&&value>0)
    const bids=(book?.bids??[]).map(level=>asNumber(level.price)).filter((value):value is number=>value!=null&&value>0)
    const last=history.map(row=>asNumber(row.price)).find((value):value is number=>value!=null&&value>0)
    const volume24h=history.reduce((total,row)=>total+(asNumber(row.amount)??0),0)
    if(!asks.length&&!bids.length&&last==null)return null
    return {
      venue:this.venue,
      pair,
      bid:bids.length?Math.max(...bids):undefined,
      ask:asks.length?Math.min(...asks):undefined,
      last,
      volume24h:volume24h||undefined,
      timestamp:new Date().toISOString(),
      source:`${this.apiBase}/market/${pair.replace('/','/')}`,
    }
  }
}
