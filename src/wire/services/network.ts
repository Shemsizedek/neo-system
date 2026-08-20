export type LiveState='LIVE'|'DEGRADED'|'CONFIG_REQUIRED'|'OFFLINE'

export type LiveService={
  id:string
  name:string
  state:LiveState
  detail:string
  latencyMs?:number
  observedAt:string
}

const env=((import.meta as ImportMeta & {env?:Record<string,string|undefined>}).env)||{}
const BITCOIN_API=(env.VITE_BITCOIN_ESPLORA_URL||'https://blockstream.info/api').replace(/\/$/,'')
const COUNTERPARTY_API=(env.VITE_COUNTERPARTY_API_URL||'https://api.counterparty.io:4000/v2').replace(/\/$/,'')
const LIGHTNING_HEALTH=env.VITE_LIGHTNING_HEALTH_URL
const TELECOM_HEALTH=env.VITE_TELECOM_HEALTH_URL

async function timedFetch(url:string,timeoutMs=7000){
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),timeoutMs)
  const start=performance.now()
  try{
    const response=await fetch(url,{signal:controller.signal,headers:{accept:'application/json,text/plain;q=0.9,*/*;q=0.8'}})
    return {response,latencyMs:Math.round(performance.now()-start)}
  }finally{clearTimeout(timer)}
}

export async function readBitcoinTip(){
  const {response,latencyMs}=await timedFetch(`${BITCOIN_API}/blocks/tip/height`)
  if(!response.ok)throw new Error(`Bitcoin API ${response.status}`)
  const height=Number(await response.text())
  if(!Number.isFinite(height))throw new Error('Invalid Bitcoin tip response')
  return {height,latencyMs}
}

export async function readBitcoinAddress(address:string){
  const {response,latencyMs}=await timedFetch(`${BITCOIN_API}/address/${encodeURIComponent(address)}`)
  if(!response.ok)throw new Error(`Bitcoin address API ${response.status}`)
  const data=await response.json() as {chain_stats?:{funded_txo_sum?:number;spent_txo_sum?:number;tx_count?:number},mempool_stats?:{funded_txo_sum?:number;spent_txo_sum?:number;tx_count?:number}}
  const chain=data.chain_stats||{}
  const mempool=data.mempool_stats||{}
  const confirmed=(chain.funded_txo_sum||0)-(chain.spent_txo_sum||0)
  const unconfirmed=(mempool.funded_txo_sum||0)-(mempool.spent_txo_sum||0)
  return {confirmedSats:confirmed,unconfirmedSats:unconfirmed,txCount:(chain.tx_count||0)+(mempool.tx_count||0),latencyMs}
}

export async function readCounterpartyBalances(address:string){
  const {response,latencyMs}=await timedFetch(`${COUNTERPARTY_API}/addresses/${encodeURIComponent(address)}/balances`)
  if(!response.ok)throw new Error(`Counterparty API ${response.status}`)
  const payload=await response.json() as {result?:unknown[]}|unknown[]
  const result=Array.isArray(payload)?payload:Array.isArray(payload.result)?payload.result:[]
  return {balances:result,latencyMs}
}

async function checkBitcoin():Promise<LiveService>{
  const observedAt=new Date().toISOString()
  try{const r=await readBitcoinTip();return{id:'btc',name:'Bitcoin / Esplora',state:'LIVE',detail:`Mainnet tip ${r.height.toLocaleString()}`,latencyMs:r.latencyMs,observedAt}}
  catch(error){return{id:'btc',name:'Bitcoin / Esplora',state:'OFFLINE',detail:error instanceof Error?error.message:'Bitcoin read failed',observedAt}}
}

async function checkCounterparty():Promise<LiveService>{
  const observedAt=new Date().toISOString()
  try{
    const {response,latencyMs}=await timedFetch(`${COUNTERPARTY_API}/healthz`)
    if(!response.ok)throw new Error(`Counterparty API ${response.status}`)
    return{id:'xcp',name:'Counterparty Core v2',state:'LIVE',detail:'Read-only API health check passed',latencyMs,observedAt}
  }catch(error){return{id:'xcp',name:'Counterparty Core v2',state:'DEGRADED',detail:`Public endpoint unavailable or blocked; set VITE_COUNTERPARTY_API_URL. ${error instanceof Error?error.message:''}`.trim(),observedAt}}
}

async function checkOptional(id:string,name:string,url:string|undefined):Promise<LiveService>{
  const observedAt=new Date().toISOString()
  if(!url)return{id,name,state:'CONFIG_REQUIRED',detail:`Set ${id==='ln'?'VITE_LIGHTNING_HEALTH_URL':'VITE_TELECOM_HEALTH_URL'} to enable live health`,observedAt}
  try{const {response,latencyMs}=await timedFetch(url);if(!response.ok)throw new Error(`HTTP ${response.status}`);return{id,name,state:'LIVE',detail:'Credential-gated health endpoint reachable',latencyMs,observedAt}}
  catch(error){return{id,name,state:'OFFLINE',detail:error instanceof Error?error.message:'Health check failed',observedAt}}
}

export async function getLiveNetworkSnapshot():Promise<LiveService[]>{
  return Promise.all([
    checkBitcoin(),
    checkCounterparty(),
    checkOptional('ln','Lightning Node',LIGHTNING_HEALTH),
    checkOptional('telco','Telecom / SIP-SMS-IVR',TELECOM_HEALTH),
    Promise.resolve({id:'world',name:'World Currency Layer',state:'LIVE' as const,detail:'Quote/display adapter active; settlement remains disabled',observedAt:new Date().toISOString()}),
    Promise.resolve({id:'nvsn',name:'NVSN Bridge',state:'LIVE' as const,detail:'Software integration boundary active; no radio control',observedAt:new Date().toISOString()})
  ])
}
