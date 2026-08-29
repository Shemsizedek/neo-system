import { formatAssetAmount } from './asset-display.js'

const API='https://api.counterparty.io:4000/v2'

async function get(path){
  const r=await fetch(`${API}${path}`,{
    headers:{accept:'application/json','user-agent':'neo-discord-api'},
    signal:AbortSignal.timeout(15000)
  })
  const body=await r.json().catch(()=>({}))
  if(!r.ok)throw new Error(`Counterparty ${r.status}: ${body?.error||body?.message||'request failed'}`)
  if(body?.error)throw new Error(`Counterparty: ${body.error}`)
  return {result:body?.result,headers:r.headers}
}

function normalizeQuantity(value,divisible){
  if(value===null||value===undefined)return 'unknown'
  if(!divisible)return String(value)
  const raw=String(value)
  if(!/^-?\d+$/.test(raw))return raw
  try{
    const n=BigInt(raw)
    const negative=n<0n
    const abs=negative?-n:n
    const whole=abs/100000000n
    const fraction=String(abs%100000000n).padStart(8,'0').replace(/0+$/,'')
    return `${negative?'-':''}${whole}${fraction?'.'+fraction:''}`
  }catch{return raw}
}

function summarizeAsset(name,result,env){
  const a=result&&typeof result==='object'?result:{}
  const divisible=a.divisible===true
  const supply=a.supply_normalized??normalizeQuantity(a.supply,divisible)
  const divisibleText=typeof a.divisible==='boolean'?String(a.divisible):'unknown'
  const locked=typeof a.locked==='boolean'?String(a.locked):'unknown'
  return [`${name}:`,`  supply: ${formatAssetAmount(name,supply,{env})}`,`  divisible: ${divisibleText}`,`  locked: ${locked}`].join('\n')
}

export async function counterpartyStatus(env={}){
  const [root,xcp,nomni]=await Promise.all([
    get('/'),
    get('/assets/XCP'),
    get('/assets/NOMNI')
  ])
  const s=root.result||{}
  return [
    '**NEO Counterparty Live Status**',
    `Network: ${s.network??'unknown'}`,
    `Counterparty Core: ${s.version??'unknown'}`,
    `Server ready: ${String(s.server_ready??'unknown')}`,
    `Ledger state: ${s.ledger_state??root.headers.get('x-ledger-state')??'unknown'}`,
    `Bitcoin height: ${s.backend_height??root.headers.get('x-bitcoin-height')??'unknown'}`,
    `Counterparty height: ${s.counterparty_height??root.headers.get('x-counterparty-height')??'unknown'}`,
    '',summarizeAsset('XCP',xcp.result,env),'',summarizeAsset('NOMNI',nomni.result,env),'',
    'Source: live Counterparty Core API v2. NEO display policy: ∞ for designated tokenized currencies, ₿ for BTC, and no currency symbol for ordinary assets or Orange Chip™ Stocks.'
  ].join('\n')
}
