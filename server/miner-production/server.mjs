import http from 'node:http'
import {evaluateProductionReadiness,buildProductionHealthSnapshot,assertLiveContractActivation} from './readiness.mjs'
import {collectLiveProbe} from './liveClients.mjs'
import {liveProviderSnapshot} from './providers.mjs'
import {createContract,confirmPayment,reserveCapacity,activateContract,markSettlementPending,settleContract} from './contracts.mjs'
import {createInfrastructureRecord,markInfrastructureVerified,onboardingSummary} from './onboarding.mjs'

const PORT=Number(process.env.PORT||8890)
const API_TOKEN=process.env.NEO_MINER_API_TOKEN||''
const contracts=new Map()
const infrastructure=new Map()

function configFromEnv(){
  return {
    bitcoin:{enabled:process.env.BITCOIN_ENABLED==='true',rpcUrl:process.env.BITCOIN_RPC_URL,secretRef:process.env.BITCOIN_RPC_AUTH?'env://BITCOIN_RPC_AUTH':'',auth:process.env.BITCOIN_RPC_AUTH},
    counterparty:{enabled:process.env.COUNTERPARTY_ENABLED==='true',apiUrl:process.env.COUNTERPARTY_API_URL},
    pool:{enabled:process.env.MINING_POOL_ENABLED==='true',endpoint:process.env.MINING_POOL_ENDPOINT},
    miners:{enabled:process.env.MINER_AGENTS_ENABLED==='true',verifiedAgentCount:Number(process.env.VERIFIED_MINER_AGENTS||0)},
    fx:{enabled:process.env.FX_ENABLED==='true',apiUrl:process.env.FX_API_URL,source:process.env.FX_SOURCE,apiKey:process.env.FX_API_KEY,base:process.env.FX_BASE||'USD',quote:process.env.FX_PROBE_QUOTE||'EUR'},
    payments:{enabled:process.env.PAYMENTS_ENABLED==='true',provider:process.env.PAYMENT_PROVIDER,secretRef:process.env.PAYMENT_PROVIDER_SECRET?'env://PAYMENT_PROVIDER_SECRET':'',webhookSignatureVerification:process.env.PAYMENT_WEBHOOK_VERIFY==='true'},
    storage:{contracts:process.env.CONTRACT_STORE||'PERSISTENT',settlements:process.env.SETTLEMENT_STORE||'PERSISTENT'},
    compliance:{enabled:process.env.COMPLIANCE_ENABLED==='true',activationPolicy:process.env.COMPLIANCE_POLICY||'FAIL_CLOSED'}
  }
}

async function runtimeReadiness(){
  const config=configFromEnv()
  const configured=evaluateProductionReadiness(config)
  if(!configured.ready) return {...configured,liveProbe:null}
  const liveProbe=await collectLiveProbe(config)
  if(!liveProbe.ok) return {...configured,ready:false,mode:'BLOCKED',missing:[...configured.missing,'live_probe'],liveProbe}
  return {...configured,liveProbe}
}

const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','access-control-allow-origin':process.env.CORS_ORIGIN||'https://shemsizedek.github.io'});res.end(JSON.stringify(body))}
const authorized=req=>Boolean(API_TOKEN)&&req.headers.authorization===`Bearer ${API_TOKEN}`
const readBody=req=>new Promise((resolve,reject)=>{let raw='';req.on('data',c=>{raw+=c;if(raw.length>100_000)reject(new Error('body too large'))});req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch(e){reject(e)}});req.on('error',reject)})
const store=c=>{contracts.set(c.id,c);return c}
const getContract=id=>{const c=contracts.get(id);if(!c)throw new Error('CONTRACT_NOT_FOUND');return c}

export const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':process.env.CORS_ORIGIN||'https://shemsizedek.github.io','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,OPTIONS'});return res.end()}
  if(req.method==='GET'&&req.url==='/health'){
    const configured=evaluateProductionReadiness(configFromEnv())
    return json(res,200,{service:'neo-miner-production',status:'UP',mode:configured.mode,time:new Date().toISOString()})
  }
  if(req.method==='GET'&&req.url==='/ready'){
    const readiness=await runtimeReadiness()
    return json(res,readiness.ready?200:503,readiness)
  }
  if(req.method==='GET'&&req.url==='/providers'){
    if(!authorized(req)) return json(res,401,{error:'unauthorized'})
    return json(res,200,await liveProviderSnapshot())
  }
  if(req.method==='GET'&&req.url==='/probe'){
    if(!authorized(req)) return json(res,401,{error:'unauthorized'})
    return json(res,200,await collectLiveProbe(configFromEnv()))
  }
  if(req.method==='GET'&&req.url==='/snapshot'){
    if(!authorized(req)) return json(res,401,{error:'unauthorized'})
    const readiness=await runtimeReadiness()
    return json(res,200,buildProductionHealthSnapshot({readiness,minerFleet:{verifiedAgents:Number(process.env.VERIFIED_MINER_AGENTS||0),hashrateTh:Number(process.env.FLEET_HASHRATE_TH||0),online:Number(process.env.MINERS_ONLINE||0)},pool:{connected:Boolean(readiness.liveProbe?.pool?.connected),acceptedShares:Number(process.env.ACCEPTED_SHARES||0),rejectedShares:Number(process.env.REJECTED_SHARES||0)},payments:{provider:process.env.PAYMENT_PROVIDER,enabledCurrencies:(process.env.ENABLED_CURRENCIES||'').split(',').filter(Boolean),webhookVerified:process.env.PAYMENT_WEBHOOK_VERIFY==='true'},chains:{bitcoinConnected:Boolean(readiness.liveProbe?.bitcoin?.connected),bitcoinHeight:readiness.liveProbe?.bitcoin?.blocks??null,counterpartyConnected:Boolean(readiness.liveProbe?.counterparty?.connected),counterpartyHeight:null}}))
  }
  if(req.method==='GET'&&req.url==='/infrastructure'){
    if(!authorized(req)) return json(res,401,{error:'unauthorized'})
    const records=[...infrastructure.values()]
    return json(res,200,{summary:onboardingSummary(records),records})
  }
  if(req.method==='POST'&&req.url==='/infrastructure'){
    if(!authorized(req)) return json(res,401,{error:'unauthorized'})
    try{const record=createInfrastructureRecord(await readBody(req));infrastructure.set(record.id,record);return json(res,201,record)}catch(error){return json(res,400,{error:error.message})}
  }
  const infraMatch=req.url?.match(/^\/infrastructure\/([^/]+)\/verify$/)
  if(req.method==='POST'&&infraMatch){
    if(!authorized(req)) return json(res,401,{error:'unauthorized'})
    try{
      const record=infrastructure.get(infraMatch[1]);if(!record)throw new Error('INFRASTRUCTURE_NOT_FOUND')
      const body=await readBody(req)
      const verified=markInfrastructureVerified(record,{ok:body.ok===true,detail:body.detail})
      infrastructure.set(verified.id,verified)
      return json(res,200,verified)
    }catch(error){return json(res,409,{error:error.message})}
  }
  if(req.method==='POST'&&req.url==='/contracts'){
    if(!authorized(req)) return json(res,401,{error:'unauthorized'})
    try{return json(res,201,store(createContract(await readBody(req))))}catch(error){return json(res,400,{error:error.message})}
  }
  const match=req.url?.match(/^\/contracts\/([^/]+)\/(payment|reserve|activate|settlement-pending|settle)$/)
  if(req.method==='POST'&&match){
    if(!authorized(req)) return json(res,401,{error:'unauthorized'})
    try{
      const [,id,action]=match
      let c=getContract(id)
      const body=await readBody(req)
      if(action==='payment') c=confirmPayment(c,body)
      if(action==='reserve') c=reserveCapacity(c,body)
      if(action==='activate'){
        const readiness=await runtimeReadiness()
        const activation=assertLiveContractActivation({productionReady:readiness.ready,paymentConfirmed:c.state==='CAPACITY_RESERVED',contractExecuted:true,capacityBacked:true,customerSettlementDestinationVerified:body.settlementDestinationVerified===true,simulation:c.simulation,orderId:body.orderId,contractId:c.id})
        c=activateContract(c,{...body,activationId:activation.activationId,productionReady:readiness.ready})
      }
      if(action==='settlement-pending') c=markSettlementPending(c,body)
      if(action==='settle') c=settleContract(c,body)
      return json(res,200,store(c))
    }catch(error){return json(res,409,{error:error.message})}
  }
  return json(res,404,{error:'not_found'})
})

if(import.meta.url===`file://${process.argv[1]}`) server.listen(PORT,'0.0.0.0',()=>console.log(`NEO Miner production API listening on ${PORT}`))
