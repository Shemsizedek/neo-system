import net from 'node:net'
import tls from 'node:tls'
import crypto from 'node:crypto'

const timeoutMs=Number(process.env.PROVIDER_TIMEOUT_MS||5000)

async function fetchJson(url,init={}){
  const controller=new AbortController()
  const timer=setTimeout(()=>controller.abort(),timeoutMs)
  try{
    const res=await fetch(url,{...init,signal:controller.signal})
    const text=await res.text()
    let body=null
    try{body=text?JSON.parse(text):null}catch{body=text}
    if(!res.ok) throw new Error(`HTTP_${res.status}`)
    return body
  }finally{clearTimeout(timer)}
}

export async function bitcoinRpc(method='getblockchaininfo',params=[]){
  const url=process.env.BITCOIN_RPC_URL
  const auth=process.env.BITCOIN_RPC_AUTH
  if(!url||!auth) throw new Error('BITCOIN_RPC_UNCONFIGURED')
  return fetchJson(url,{method:'POST',headers:{'content-type':'application/json','authorization':`Basic ${Buffer.from(auth).toString('base64')}`},body:JSON.stringify({jsonrpc:'2.0',id:'neo-miner',method,params})})
}

export async function counterpartyHealth(){
  const base=(process.env.COUNTERPARTY_API_URL||'').replace(/\/$/,'')
  if(!base) throw new Error('COUNTERPARTY_UNCONFIGURED')
  return fetchJson(`${base}/healthz`,{headers:process.env.COUNTERPARTY_API_TOKEN?{'authorization':`Bearer ${process.env.COUNTERPARTY_API_TOKEN}`}:{}})
}

function parseStratumEndpoint(value){
  const u=new URL(value.replace(/^stratum\+tcp:/,'tcp:').replace(/^stratum\+ssl:/,'tls:').replace(/^stratum:/,'tcp:'))
  return {host:u.hostname,port:Number(u.port||3333),secure:u.protocol==='tls:'}
}

export async function stratumProbe(){
  const endpoint=process.env.MINING_POOL_ENDPOINT
  if(!endpoint) throw new Error('MINING_POOL_UNCONFIGURED')
  const {host,port,secure}=parseStratumEndpoint(endpoint)
  return new Promise((resolve,reject)=>{
    const socket=secure?tls.connect({host,port,servername:host}):net.createConnection({host,port})
    const timer=setTimeout(()=>{socket.destroy();reject(new Error('STRATUM_TIMEOUT'))},timeoutMs)
    socket.once('connect',()=>{clearTimeout(timer);socket.end();resolve({connected:true,host,port,secure})})
    socket.once('error',err=>{clearTimeout(timer);reject(err)})
  })
}

export async function fxProbe(){
  const url=process.env.FX_API_URL
  if(!url) throw new Error('FX_UNCONFIGURED')
  const headers=process.env.FX_API_TOKEN?{'authorization':`Bearer ${process.env.FX_API_TOKEN}`}:{ }
  const body=await fetchJson(url,{headers})
  return {ok:true,source:process.env.FX_SOURCE||'UNSPECIFIED',sample:body}
}

export function verifyPaymentWebhook({rawBody,signature,secret}){
  if(!rawBody||!signature||!secret) return false
  const expected=crypto.createHmac('sha256',secret).update(rawBody).digest('hex')
  const supplied=String(signature).replace(/^sha256=/,'')
  const a=Buffer.from(expected)
  const b=Buffer.from(supplied)
  return a.length===b.length&&crypto.timingSafeEqual(a,b)
}

export async function paymentProviderProbe(){
  const url=process.env.PAYMENT_PROVIDER_HEALTH_URL
  if(!url) throw new Error('PAYMENT_PROVIDER_HEALTH_UNCONFIGURED')
  const headers={}
  if(process.env.PAYMENT_PROVIDER_SECRET) headers.authorization=`Bearer ${process.env.PAYMENT_PROVIDER_SECRET}`
  const body=await fetchJson(url,{headers})
  return {ok:true,provider:process.env.PAYMENT_PROVIDER||'UNSPECIFIED',body}
}

export async function liveProviderSnapshot(){
  const entries=await Promise.allSettled([
    bitcoinRpc(),counterpartyHealth(),stratumProbe(),fxProbe(),paymentProviderProbe()
  ])
  const names=['bitcoin','counterparty','stratum','fx','payments']
  return Object.fromEntries(entries.map((r,i)=>[names[i],r.status==='fulfilled'?{ok:true,data:r.value}:{ok:false,error:r.reason?.message||String(r.reason)}]))
}
