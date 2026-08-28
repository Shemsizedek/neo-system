import net from 'node:net'
import tls from 'node:tls'

const withTimeout=(promise,ms=8000)=>Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),ms))])

export async function probeBitcoinRpc({url,auth}){
  if(!url||!auth) throw new Error('Bitcoin RPC configuration missing')
  const response=await withTimeout(fetch(url,{method:'POST',headers:{'content-type':'application/json','authorization':`Basic ${Buffer.from(auth).toString('base64')}`},body:JSON.stringify({jsonrpc:'2.0',id:'neo-miner',method:'getblockchaininfo',params:[]})}))
  if(!response.ok) throw new Error(`Bitcoin RPC HTTP ${response.status}`)
  const body=await response.json()
  if(body.error) throw new Error(body.error.message||'Bitcoin RPC error')
  return {connected:true,chain:body.result?.chain,blocks:body.result?.blocks,headers:body.result?.headers,verificationProgress:body.result?.verificationprogress}
}

export async function probeCounterpartyV2(apiUrl){
  if(!apiUrl) throw new Error('Counterparty API URL missing')
  const root=apiUrl.replace(/\/$/,'')
  const response=await withTimeout(fetch(`${root}/healthz`,{headers:{accept:'application/json'}}))
  if(!response.ok) throw new Error(`Counterparty API HTTP ${response.status}`)
  const body=await response.json().catch(()=>({status:'ok'}))
  return {connected:true,health:body}
}

export async function fetchFxQuote({apiUrl,base='USD',quote='EUR',apiKey}){
  if(!apiUrl) throw new Error('FX API URL missing')
  const url=new URL(apiUrl)
  url.searchParams.set('base',base)
  url.searchParams.set('symbols',quote)
  const headers={accept:'application/json'}
  if(apiKey) headers.authorization=`Bearer ${apiKey}`
  const response=await withTimeout(fetch(url,{headers}))
  if(!response.ok) throw new Error(`FX API HTTP ${response.status}`)
  const body=await response.json()
  const rate=body?.rates?.[quote]??body?.data?.[quote]??body?.rate
  if(!(Number(rate)>0)) throw new Error('FX provider response missing usable rate')
  return {base,quote,rate:Number(rate),source:body?.source||url.hostname,timestamp:body?.timestamp||new Date().toISOString()}
}

export async function probeStratumEndpoint(endpoint,timeoutMs=5000){
  const parsed=new URL(endpoint.replace('stratum+tcp://','tcp://').replace('stratum+ssl://','tls://').replace('stratum://','tcp://'))
  const secure=parsed.protocol==='tls:'
  const port=Number(parsed.port||3333)
  const host=parsed.hostname
  return await new Promise((resolve,reject)=>{
    const socket=secure?tls.connect({host,port,servername:host,rejectUnauthorized:true}):net.createConnection({host,port})
    const timer=setTimeout(()=>{socket.destroy();reject(new Error('Stratum connection timeout'))},timeoutMs)
    socket.once('connect',()=>{clearTimeout(timer);socket.end();resolve({connected:true,host,port,secure})})
    socket.once('error',err=>{clearTimeout(timer);reject(err)})
  })
}

export async function collectLiveProbe(config={}){
  const result={timestamp:new Date().toISOString(),bitcoin:null,counterparty:null,pool:null,fx:null,errors:{}}
  const tasks=[]
  if(config.bitcoin?.enabled) tasks.push(probeBitcoinRpc({url:config.bitcoin.rpcUrl,auth:config.bitcoin.auth}).then(v=>result.bitcoin=v).catch(e=>result.errors.bitcoin=e.message))
  if(config.counterparty?.enabled) tasks.push(probeCounterpartyV2(config.counterparty.apiUrl).then(v=>result.counterparty=v).catch(e=>result.errors.counterparty=e.message))
  if(config.pool?.enabled) tasks.push(probeStratumEndpoint(config.pool.endpoint).then(v=>result.pool=v).catch(e=>result.errors.pool=e.message))
  if(config.fx?.enabled) tasks.push(fetchFxQuote(config.fx).then(v=>result.fx=v).catch(e=>result.errors.fx=e.message))
  await Promise.all(tasks)
  result.ok=Object.keys(result.errors).length===0
  return result
}
