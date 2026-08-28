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

function summarizeAsset(name,result){
  const a=result&&typeof result==='object'?result:{}
  const supply=a.supply_normalized??a.supply??'unknown'
  const divisible=typeof a.divisible==='boolean'?String(a.divisible):'unknown'
  const locked=typeof a.locked==='boolean'?String(a.locked):'unknown'
  return [`${name}:`,`  supply: ${supply}`,`  divisible: ${divisible}`,`  locked: ${locked}`].join('\n')
}

export async function counterpartyStatus(){
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
    '',summarizeAsset('XCP',xcp.result),'',summarizeAsset('NOMNI',nomni.result),'',
    'Source: live Counterparty Core API v2. No market price is inferred.'
  ].join('\n')
}
