import type {CesAdapter} from '../ces/adapter'
import type {CesCoordinatorAgent,CesExchange,CesNormalizedRecord} from '../ces/types'
import type {MarketAdapter,MarketQuote} from './marketAdapters'

const numberFrom=(value:unknown)=>{
  if(typeof value==='number')return Number.isFinite(value)?value:undefined
  if(typeof value==='string'&&value.trim()!==''){
    const n=Number(value)
    return Number.isFinite(n)?n:undefined
  }
  return undefined
}

export class CesMarketAdapter implements MarketAdapter{
  readonly venue='CES' as const
  constructor(
    private readonly ces:CesAdapter,
    private readonly exchange:CesExchange,
    private readonly agent:CesCoordinatorAgent,
  ){}

  async getQuote(pair:string):Promise<MarketQuote|null>{
    const records=await this.ces.getRecords(this.exchange,this.agent,['OFFER','TRADE'] as never)
    return normalizeCesQuote(pair,records,this.exchange.xid)
  }
}

export function normalizeCesQuote(pair:string,records:CesNormalizedRecord[],exchangeId:string):MarketQuote|null{
  const [base,quote]=pair.split('/')
  if(!base||!quote)return null
  let bid:number|undefined
  let ask:number|undefined
  let last:number|undefined
  let volume24h=0
  let latest=''

  for(const record of records){
    const payload=record.payload as Record<string,unknown>
    const recordPair=String(payload.pair??payload.market??'').toUpperCase()
    const asset=String(payload.asset??payload.base??'').toUpperCase()
    const currency=String(payload.currency??payload.quote??'').toUpperCase()
    const relevant=recordPair===pair.toUpperCase()||(asset===base.toUpperCase()&&currency===quote.toUpperCase())
    if(!relevant)continue

    const price=numberFrom(payload.price??payload.rate??payload.unitPrice)
    const amount=numberFrom(payload.amount??payload.quantity??payload.volume)
    const side=String(payload.side??payload.type??'').toLowerCase()
    if(price&&price>0){
      if(record.kind==='TRADE')last=price
      if(side.includes('buy')||side.includes('bid'))bid=bid==null?price:Math.max(bid,price)
      if(side.includes('sell')||side.includes('ask'))ask=ask==null?price:Math.min(ask,price)
      if(amount&&record.kind==='TRADE')volume24h+=amount
    }
    if(record.observedAt>latest)latest=record.observedAt
  }

  if(bid==null&&ask==null&&last==null)return null
  return {venue:'CES',pair,bid,ask,last,volume24h:volume24h||undefined,timestamp:latest||new Date().toISOString(),source:`CES:${exchangeId}`}
}
