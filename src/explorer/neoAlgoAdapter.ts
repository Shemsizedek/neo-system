import {runNeoAlgo} from '../../core/neo-algo/index.js'
import type {NeoAlgoResult, NeoCycle} from '../../core/neo-algo/index.js'
import type {MarketQuote, MarketVenue} from './marketAdapters'

export type EvidenceStatus='verified'|'reported'|'illustrative'|'unavailable'

export type MarketObservation={
  venue: MarketVenue
  source: string
  status: EvidenceStatus
  note: string
  quote?: MarketQuote|null
}

export type ExplorerAlgoAnalysis={
  pair: string
  result: NeoAlgoResult
  observations: MarketObservation[]
  confidence: 'low'|'medium'|'high'
  conflicts: string[]
}

function confidenceFor(observations:MarketObservation[]){
  const verified=observations.filter(o=>o.status==='verified').length
  const unavailable=observations.filter(o=>o.status==='unavailable').length
  if(verified>=2&&unavailable===0)return 'high' as const
  if(verified>=1)return 'medium' as const
  return 'low' as const
}

function detectConflicts(observations:MarketObservation[]){
  const priced=observations.flatMap(o=>o.quote?.last==null?[]:[{source:o.source,last:o.quote.last}])
  if(priced.length<2)return []
  const values=priced.map(p=>p.last)
  const low=Math.min(...values)
  const high=Math.max(...values)
  if(low<=0)return ['Invalid non-positive market price detected.']
  const spread=(high-low)/low
  return spread>0.05?[`Cross-venue last-price divergence is ${(spread*100).toFixed(1)}%. Preserve venue attribution before valuation or execution.`]:[]
}

export function analyzeExplorerMarket(pair:string,observations:MarketObservation[],cycle:NeoCycle='human'):ExplorerAlgoAnalysis{
  const conflicts=detectConflicts(observations)
  const confidence=confidenceFor(observations)
  const result=runNeoAlgo({
    id:`NEO-EXPLORER-${pair.replace(/[^A-Z0-9]/gi,'-')}`,
    objective:`Analyze ${pair} market evidence for NEO Explorer and produce source-attributed market intelligence.`,
    context:{
      pair,
      confidence,
      conflicts,
      observations:observations.map(({venue,source,status,note,quote})=>({venue,source,status,note,quote})),
      principles:['token record is distinct from off-chain legal/economic claims','preserve source attribution','do not manufacture missing prices'],
    },
  },cycle)
  return {pair,result,observations,confidence,conflicts}
}

export function analyzeTradeIntent(pair:string,side:'buy'|'sell',amount:number,observations:MarketObservation[]):ExplorerAlgoAnalysis{
  const conflicts=detectConflicts(observations)
  const confidence=confidenceFor(observations)
  const result=runNeoAlgo({
    id:`NEO-DEX-${side.toUpperCase()}-${pair.replace(/[^A-Z0-9]/gi,'-')}`,
    objective:`Evaluate a proposed ${side} of ${amount} units on ${pair}.`,
    requestedAction:'financial_transfer',
    consequential:true,
    context:{pair,side,amount,confidence,conflicts,observations},
  })
  return {pair,result,observations,confidence,conflicts}
}
