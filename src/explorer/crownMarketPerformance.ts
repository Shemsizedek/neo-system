import type {CrownMarketRecord,Measurement} from './crownMarketSchema'

export type MeasuredPoint={at:string;value:number;unit:string;sourceRefs:string[];state:Measurement['state']}
export type PerformanceResult={status:'calculated'|'unavailable';changePercent?:number;start?:MeasuredPoint;end?:MeasuredPoint;reason?:string}

/** Return observations only when definitions, units, evidence, and dates are comparable. */
export function measureSeries(record:CrownMarketRecord,name:string):MeasuredPoint[]{
  return record.measurements.filter(m=>m.name===name&&m.sourceRefs.length>0&&m.state!=='OBSERVED'&&Number.isFinite(Number(m.value))&&m.value.trim()!==''&&Number.isFinite(Date.parse(m.asOf)))
    .map(m=>({at:m.asOf,value:Number(m.value),unit:m.unit,sourceRefs:m.sourceRefs,state:m.state}))
    .sort((a,b)=>Date.parse(a.at)-Date.parse(b.at))
}
export function calculateChange(record:CrownMarketRecord,name:string):PerformanceResult{
  const series=measureSeries(record,name)
  if(series.length<2)return {status:'unavailable',reason:'Two dated, source-attributed numeric observations required'}
  const start=series[0],end=series[series.length-1]
  if(start.unit!==end.unit)return {status:'unavailable',reason:'Incompatible units'}
  if(start.at===end.at)return {status:'unavailable',reason:'Identical observation dates'}
  if(start.value===0)return {status:'unavailable',reason:'Zero baseline'}
  return {status:'calculated',changePercent:(end.value-start.value)/Math.abs(start.value)*100,start,end}
}
export function comparisonAllowed(a:Measurement,b:Measurement):boolean{
  return a.name===b.name&&a.unit===b.unit&&a.asOf===b.asOf&&
   a.sourceRefs.length>0&&b.sourceRefs.length>0&&
   !!a.method&&a.method===b.method&&a.state!=='OBSERVED'&&b.state!=='OBSERVED'
}
