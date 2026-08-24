export const ORANGE_CHIP_FOUNDATION_ADDRESS='1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'
export type MarketVenue='XCP_DEX'|'CES'|'EXTERNAL'|'NEO_DEX'
export type MarketQuote={venue:MarketVenue;pair:string;bid?:number;ask?:number;last?:number;volume24h?:number;timestamp:string;source:string}
export interface MarketAdapter{venue:MarketVenue;getQuote(pair:string):Promise<MarketQuote|null>}

export type MarketSnapshot={pair:string;quotes:MarketQuote[];observedAt:string}

export async function collectMarketSnapshot(pair:string,adapters:MarketAdapter[]):Promise<MarketSnapshot>{
  const settled=await Promise.allSettled(adapters.map(adapter=>adapter.getQuote(pair)))
  const quotes=settled.flatMap(result=>result.status==='fulfilled'&&result.value?[result.value]:[])
  return {pair,quotes,observedAt:new Date().toISOString()}
}

export function bestAttributedMarket(snapshot:MarketSnapshot){
  const bids=snapshot.quotes.filter(q=>q.bid!=null)
  const asks=snapshot.quotes.filter(q=>q.ask!=null)
  return {
    bestBid:bids.length?bids.reduce((a,b)=>(b.bid??0)>(a.bid??0)?b:a):undefined,
    bestAsk:asks.length?asks.reduce((a,b)=>(b.ask??Infinity)<(a.ask??Infinity)?b:a):undefined,
    sources:snapshot.quotes.map(q=>({venue:q.venue,source:q.source,timestamp:q.timestamp})),
  }
}

export const marketAdapterRoadmap={
  xcpDex:'Read Counterparty v2 orders, holders, dispensers and Orange Chip™ foundation balances through public/read-only endpoints.',
  ces:'Normalize authorized CES offers and trades through the existing CES adapter/coordinator permission model.',
  external:'Add venue-specific connectors without treating one venue as canonical for price.',
  neoDex:'Aggregate attributed quotes and route users to non-custodial Counterparty/Bitcoin execution flows.'
} as const

export {CounterpartyV2MarketAdapter} from './counterpartyAdapter'
export {CesMarketAdapter,normalizeCesQuote} from './cesMarketAdapter'
