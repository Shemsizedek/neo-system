import http from 'node:http'
import {assertNoSecrets,buildComposeUrl,normalizeComposition} from './composer.mjs'

const PORT=Number(process.env.NEO_TELLER_PORT||8787)
const CP=(process.env.COUNTERPARTY_API_URL||'').replace(/\/$/,'')
const BTC=(process.env.BITCOIN_ELECTRS_URL||'https://blockstream.info/api').replace(/\/$/,'')

async function getJson(url){const r=await fetch(url,{headers:{accept:'application/json','user-agent':'neo-teller/0.3'}});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.json()}
async function getText(url){const r=await fetch(url,{headers:{accept:'text/plain','user-agent':'neo-teller/0.3'}});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.text()}
async function readJson(req){return new Promise((resolve,reject)=>{let body='';req.on('data',c=>{body+=c;if(body.length>64_000){reject(new Error('REQUEST_TOO_LARGE'));req.destroy()}});req.on('end',()=>{try{resolve(body?JSON.parse(body):{})}catch{reject(new Error('INVALID_JSON'))}});req.on('error',reject)})}

async function counterpartyAsset(asset){
  if(!CP) return {status:'UNAVAILABLE',source:'COUNTERPARTY_API_URL not configured'}
  try{
    const data=await getJson(`${CP}/v2/assets/${encodeURIComponent(asset)}`)
    const row=data?.result??data
    return {status:'VERIFIED',issuer:row?.issuer,divisible:row?.divisible,locked:row?.locked,source:CP}
  }catch(e){return {status:'UNAVAILABLE',source:CP,error:e instanceof Error?e.message:String(e)}}
}

async function counterpartyHealth(){
  if(!CP) return {status:'OFFLINE',source:'COUNTERPARTY_API_URL not configured'}
  for(const path of ['/v2/','/v2/healthz','/healthz']){
    try{const data=await getJson(`${CP}${path}`);return {status:'ONLINE',source:CP,version:data?.version??data?.result?.version}}
    catch{}
  }
  return {status:'OFFLINE',source:CP}
}

async function bitcoinHealth(){
  try{const height=Number((await getText(`${BTC}/blocks/tip/height`)).trim());return {status:'ONLINE',source:BTC,blockHeight:Number.isFinite(height)?height:undefined}}
  catch{return {status:'OFFLINE',source:BTC}}
}

function json(res,status,body){res.writeHead(status,{'content-type':'application/json','access-control-allow-origin':'*','cache-control':'no-store'});res.end(JSON.stringify(body))}

async function composeSend(req,res){
  if(!CP) return json(res,503,{error:'COUNTERPARTY_API_NOT_CONFIGURED'})
  try{
    const input=await readJson(req)
    assertNoSecrets(input)
    const {url,intent}=buildComposeUrl(CP,input)
    const payload=await getJson(url)
    return json(res,200,normalizeComposition(payload,intent))
  }catch(e){
    const message=e instanceof Error?e.message:String(e)
    const status=message.startsWith('FORBIDDEN_SECRET_FIELD')?400:message.startsWith('INVALID_')?400:502
    return json(res,status,{error:message,signingBoundary:'USER_CONTROLLED_ONLY'})
  }
}

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,accept'});return res.end()}
  if(req.method==='GET'&&req.url==='/health') return json(res,200,{ok:true,service:'neo-teller-backend',mode:'COMPOSE_ONLY',privateKeysAccepted:false,broadcastEnabled:false})
  if(req.method==='GET'&&req.url==='/api/v1/teller/network'){
    const[counterparty,bitcoin,NOMNI,XCP]=await Promise.all([counterpartyHealth(),bitcoinHealth(),counterpartyAsset('NOMNI'),counterpartyAsset('XCP')])
    return json(res,200,{observedAt:new Date().toISOString(),counterparty,bitcoin,assets:{NOMNI,XCP},capabilities:{readOnly:false,compose:true,sign:false,broadcast:false,privateKeysAccepted:false}})
  }
  if(req.method==='POST'&&req.url==='/api/v1/teller/compose/send') return composeSend(req,res)
  return json(res,404,{error:'NOT_FOUND'})
})

server.listen(PORT,()=>console.log(`NEO Teller compose-only gateway listening on :${PORT}`))
