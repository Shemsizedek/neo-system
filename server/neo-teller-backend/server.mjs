import http from 'node:http'

const PORT=Number(process.env.NEO_TELLER_PORT||8787)
const CP=(process.env.COUNTERPARTY_API_URL||'').replace(/\/$/,'')
const BTC=(process.env.BITCOIN_ELECTRS_URL||'https://blockstream.info/api').replace(/\/$/,'')

async function getJson(url){const r=await fetch(url,{headers:{accept:'application/json','user-agent':'neo-teller/0.2'}});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.json()}
async function getText(url){const r=await fetch(url,{headers:{accept:'text/plain','user-agent':'neo-teller/0.2'}});if(!r.ok)throw new Error(`${r.status} ${r.statusText}`);return r.text()}

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

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'content-type,accept'});return res.end()}
  if(req.method==='GET'&&req.url==='/health') return json(res,200,{ok:true,service:'neo-teller-backend',mode:'READ_ONLY'})
  if(req.method==='GET'&&req.url==='/api/v1/teller/network'){
    const[counterparty,bitcoin,NOMNI,XCP]=await Promise.all([counterpartyHealth(),bitcoinHealth(),counterpartyAsset('NOMNI'),counterpartyAsset('XCP')])
    return json(res,200,{observedAt:new Date().toISOString(),counterparty,bitcoin,assets:{NOMNI,XCP},capabilities:{readOnly:true,compose:false,sign:false,broadcast:false}})
  }
  return json(res,404,{error:'NOT_FOUND'})
})

server.listen(PORT,()=>console.log(`NEO Teller read-only gateway listening on :${PORT}`))
