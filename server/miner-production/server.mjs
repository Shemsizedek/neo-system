import http from 'node:http'
import {evaluateProductionReadiness,buildProductionHealthSnapshot,assertLiveContractActivation} from './readiness.mjs'

const PORT=Number(process.env.PORT||8890)
const API_TOKEN=process.env.NEO_MINER_API_TOKEN||''

function configFromEnv(){
  return {
    bitcoin:{enabled:process.env.BITCOIN_ENABLED==='true',rpcUrl:process.env.BITCOIN_RPC_URL,secretRef:process.env.BITCOIN_RPC_AUTH?'env://BITCOIN_RPC_AUTH':''},
    counterparty:{enabled:process.env.COUNTERPARTY_ENABLED==='true',apiUrl:process.env.COUNTERPARTY_API_URL},
    pool:{enabled:process.env.MINING_POOL_ENABLED==='true',endpoint:process.env.MINING_POOL_ENDPOINT},
    miners:{enabled:process.env.MINER_AGENTS_ENABLED==='true',verifiedAgentCount:Number(process.env.VERIFIED_MINER_AGENTS||0)},
    fx:{enabled:process.env.FX_ENABLED==='true',apiUrl:process.env.FX_API_URL,source:process.env.FX_SOURCE},
    payments:{enabled:process.env.PAYMENTS_ENABLED==='true',provider:process.env.PAYMENT_PROVIDER,secretRef:process.env.PAYMENT_PROVIDER_SECRET?'env://PAYMENT_PROVIDER_SECRET':'',webhookSignatureVerification:process.env.PAYMENT_WEBHOOK_VERIFY==='true'},
    storage:{contracts:process.env.CONTRACT_STORE||'PERSISTENT',settlements:process.env.SETTLEMENT_STORE||'PERSISTENT'},
    compliance:{enabled:process.env.COMPLIANCE_ENABLED==='true',activationPolicy:process.env.COMPLIANCE_POLICY||'FAIL_CLOSED'}
  }
}

const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':process.env.CORS_ORIGIN||'https://shemsizedek.github.io'});res.end(JSON.stringify(body))}
const authorized=req=>Boolean(API_TOKEN)&&req.headers.authorization===`Bearer ${API_TOKEN}`
const readBody=req=>new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>100_000)reject(new Error('body too large'))});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch(e){reject(e)}});req.on('error',reject)})

export const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':process.env.CORS_ORIGIN||'https://shemsizedek.github.io','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'});return res.end()}
  const readiness=evaluateProductionReadiness(configFromEnv())
  if(req.method==='GET'&&req.url==='/health') return json(res,200,{service:'neo-miner-production',status:'UP',mode:readiness.mode,time:new Date().toISOString()})
  if(req.method==='GET'&&req.url==='/ready') return json(res,readiness.ready?200:503,readiness)
  if(req.method==='GET'&&req.url==='/snapshot'){
    if(!authorized(req)) return json(res,401,{error:'unauthorized'})
    return json(res,200,buildProductionHealthSnapshot({readiness,minerFleet:{verifiedAgents:Number(process.env.VERIFIED_MINER_AGENTS||0),hashrateTh:Number(process.env.FLEET_HASHRATE_TH||0),online:Number(process.env.MINERS_ONLINE||0)},pool:{connected:process.env.POOL_CONNECTED==='true',acceptedShares:Number(process.env.ACCEPTED_SHARES||0),rejectedShares:Number(process.env.REJECTED_SHARES||0)},payments:{provider:process.env.PAYMENT_PROVIDER,enabledCurrencies:(process.env.ENABLED_CURRENCIES||'').split(',').filter(Boolean),webhookVerified:process.env.PAYMENT_WEBHOOK_VERIFY==='true'},chains:{bitcoinConnected:process.env.BITCOIN_CONNECTED==='true',bitcoinHeight:Number(process.env.BITCOIN_HEIGHT||0)||null,counterpartyConnected:process.env.COUNTERPARTY_CONNECTED==='true',counterpartyHeight:Number(process.env.COUNTERPARTY_HEIGHT||0)||null}}))
  }
  if(req.method==='POST'&&req.url==='/contracts/activate'){
    if(!authorized(req)) return json(res,401,{error:'unauthorized'})
    try{const body=await readBody(req);return json(res,201,assertLiveContractActivation({...body,productionReady:readiness.ready}))}catch(error){return json(res,409,{error:error.message})}
  }
  return json(res,404,{error:'not_found'})
})

if(import.meta.url===`file://${process.argv[1]}`) server.listen(PORT,'0.0.0.0',()=>console.log(`NEO Miner production API listening on ${PORT}`))
