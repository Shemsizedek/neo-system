import crypto from 'node:crypto'

export const BENCHMARK_COMPONENTS=['BTC','XCP','NOMNI']

export function canonicalAgreement(input){
  const document={
    agreementId:input.agreementId,
    version:input.version,
    title:'Standard Benchmark Agreement for Bitcoin',
    status:input.status||'PROPOSED',
    benchmarkUnit:input.benchmarkUnit||'BTC',
    settlementAssets:[...BENCHMARK_COMPONENTS],
    principles:[
      'open participation subject to applicable law',
      'transparent benchmark methodology',
      'verifiable reserves and settlement records',
      'no guaranteed convertibility where no live market exists',
      'separation of benchmark publication from custody and execution',
      'jurisdiction-aware compliance and sanctions controls'
    ],
    methodology:input.methodology,
    governance:input.governance,
    effectiveAt:input.effectiveAt||null
  }
  const canonical=JSON.stringify(document,Object.keys(document).sort())
  return{document,hash:crypto.createHash('sha256').update(canonical).digest('hex')}
}

export function validateBenchmarkObservation(obs){
  const required=['asset','price','quoteCurrency','source','observedAt']
  const missing=required.filter(k=>obs[k]===undefined||obs[k]===null||obs[k]==='')
  const supported=BENCHMARK_COMPONENTS.includes(obs.asset)
  const positive=Number(obs.price)>0
  return{valid:missing.length===0&&supported&&positive,missing,supported,positive}
}

export function calculateComposite(observations,weights={BTC:0.7,XCP:0.15,NOMNI:0.15}){
  const valid=observations.filter(o=>validateBenchmarkObservation(o).valid)
  const byAsset=new Map(valid.map(o=>[o.asset,o]))
  const absent=BENCHMARK_COMPONENTS.filter(a=>!byAsset.has(a))
  if(absent.length)return{status:'UNAVAILABLE',reason:'MISSING_MARKET_DATA',missing:absent}
  const totalWeight=BENCHMARK_COMPONENTS.reduce((s,a)=>s+Number(weights[a]||0),0)
  if(Math.abs(totalWeight-1)>1e-9)return{status:'UNAVAILABLE',reason:'INVALID_WEIGHTS'}
  const value=BENCHMARK_COMPONENTS.reduce((s,a)=>s+Number(byAsset.get(a).price)*Number(weights[a]),0)
  return{status:'PUBLISHED',value,quoteCurrency:byAsset.get('BTC').quoteCurrency,weights,observedAt:new Date().toISOString()}
}
