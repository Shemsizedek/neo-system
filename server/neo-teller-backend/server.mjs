import http from 'node:http'
import {buildComposeUrl,normalizeComposition,assertNoSecrets} from './composer.mjs'
import {acceptSignedTransaction,buildSigningHandoff,listWalletAdapters} from './wallet-handoff.mjs'
import {normalizeBroadcastReceipt,normalizeTransactionStatus,validateBroadcastIntent} from './broadcast.mjs'
import {buildReceipt,buildSettlementRecord,verifyReceipt} from './settlement.mjs'
import {buildOperatorReport,reconcileMachine,reconcileSettlement} from './reconciliation.mjs'

const PORT=Number(process.env.NEO_TELLER_PORT||8787)
const CP=(process.env.COUNTERPARTY_API_URL||'').replace(/\/$/,'')
const BTC=(process.env.BITCOIN_ELECTRS_URL||'https://blockstream.info/api').replace(/\/$/,'')

async function request(url,options={}){const r=await fetch(url,{...options,headers:{'user-agent':'neo-teller/0.7',...(options.headers||{})}});if(!r.ok)throw new Error(`${r.status} ${r.statusText}: ${(await r.text()).slice(0,300)}`);return r}
async function getJson(url){return (await request(url,{headers:{accept:'application/json'}})).json()}
async function getText(url){return (await request(url,{headers:{accept:'text/plain'}})).text()}
async function postText(url,body){return (await request(url,{method:'POST',headers:{'content-type':'text/plain','accept':'text/plain'},body})).text()}
async function readBody(req){const chunks=[];for await(const chunk of req)chunks.push(chunk);if(chunks.reduce((n,c)=>n+c.length,0)>256_000)throw new Error('REQUEST_TOO_LARGE');return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}')}

async function counterpartyAsset(asset){if(!CP)return{status:'UNAVAILABLE',source:'COUNTERPARTY_API_URL not configured'};try{const data=await getJson(`${CP}/v2/assets/${encodeURIComponent(asset)}`);const row=data?.result??data;return{status:'VERIFIED',issuer:row?.issuer,divisible:row?.divisible,locked:row?.locked,source:CP}}catch(e){return{status:'UNAVAILABLE',source:CP,error:e instanceof Error?e.message:String(e)}}}
async function counterpartyHealth(){if(!CP)return{status:'OFFLINE',source:'COUNTERPARTY_API_URL not configured'};for(const path of ['/v2/','/v2/healthz','/healthz']){try{const data=await getJson(`${CP}${path}`);return{status:'ONLINE',source:CP,version:data?.version??data?.result?.version}}catch{}}return{status:'OFFLINE',source:CP}}
async function bitcoinHealth(){try{const height=Number((await getText(`${BTC}/blocks/tip/height`)).trim());return{status:'ONLINE',source:BTC,blockHeight:Number.isFinite(height)?height:undefined}}catch{return{status:'OFFLINE',source:BTC}}}
function json(res,status,body){res.writeHead(status,{'content-type':'application/json','access-control-allow-origin':'*','cache-control':'no-store'});res.end(JSON.stringify(body))}

const server=http.createServer(async(req,res)=>{
  if(req.method==='OPTIONS'){res.writeHead(204,{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,accept'});return res.end()}
  if(req.method==='GET'&&req.url==='/health')return json(res,200,{ok:true,service:'neo-teller-backend',mode:'NON_CUSTODIAL_RECONCILIATION'})
  if(req.method==='GET'&&req.url==='/api/v1/teller/network'){
    const[counterparty,bitcoin,NOMNI,XCP]=await Promise.all([counterpartyHealth(),bitcoinHealth(),counterpartyAsset('NOMNI'),counterpartyAsset('XCP')])
    return json(res,200,{observedAt:new Date().toISOString(),counterparty,bitcoin,assets:{NOMNI,XCP},capabilities:{readOnly:true,compose:true,sign:false,broadcast:'EXPLICIT_ONLY',walletHandoff:true,confirmationTracking:true,settlementLedger:true,tamperEvidentReceipts:true,reconciliation:true,atmCashInventory:true}})
  }
  if(req.method==='GET'&&req.url==='/api/v1/teller/wallet-adapters')return json(res,200,{adapters:listWalletAdapters(),privateKeyTransfer:false})
  if(req.method==='POST'&&req.url==='/api/v1/teller/compose/send'){
    try{if(!CP)throw new Error('COUNTERPARTY_API_URL_NOT_CONFIGURED');const body=await readBody(req);assertNoSecrets(body);const {url,intent}=buildComposeUrl(CP,body);const payload=await getJson(url);return json(res,200,normalizeComposition(payload,intent))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
  }
  if(req.method==='POST'&&req.url==='/api/v1/teller/signing-handoff'){
    try{return json(res,200,buildSigningHandoff(await readBody(req)))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
  }
  if(req.method==='POST'&&req.url==='/api/v1/teller/signed-transaction'){
    try{return json(res,200,acceptSignedTransaction(await readBody(req)))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
  }
  if(req.method==='POST'&&req.url==='/api/v1/teller/broadcast'){
    try{const input=validateBroadcastIntent(await readBody(req));const txid=(await postText(`${BTC}/tx`,input.signedTransaction)).trim();return json(res,200,normalizeBroadcastReceipt(input,txid,BTC))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
  }
  const statusMatch=req.method==='GET'&&req.url?.match(/^\/api\/v1\/teller\/transactions\/([0-9a-fA-F]{64})\/status$/)
  if(statusMatch){
    try{const txid=statusMatch[1];const[status,tipHeight]=await Promise.all([getJson(`${BTC}/tx/${txid}/status`),getText(`${BTC}/blocks/tip/height`)]);return json(res,200,normalizeTransactionStatus(txid,status,Number(String(tipHeight).trim())))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
  }
  if(req.method==='POST'&&req.url==='/api/v1/teller/settlements'){
    try{const body=await readBody(req);const record=buildSettlementRecord(body);const receipt=buildReceipt(record,{direction:body.direction||'TRANSFER'});return json(res,200,{record,receipt})}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
  }
  if(req.method==='POST'&&req.url==='/api/v1/teller/receipts/verify'){
    try{const body=await readBody(req);return json(res,200,{valid:verifyReceipt(body)})}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
  }
  if(req.method==='POST'&&req.url==='/api/v1/teller/reconciliation/machine'){
    try{return json(res,200,reconcileMachine(await readBody(req)))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
  }
  if(req.method==='POST'&&req.url==='/api/v1/teller/reconciliation/settlement'){
    try{return json(res,200,reconcileSettlement(await readBody(req)))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
  }
  if(req.method==='POST'&&req.url==='/api/v1/teller/reconciliation/report'){
    try{return json(res,200,buildOperatorReport(await readBody(req)))}catch(e){return json(res,400,{error:e instanceof Error?e.message:String(e)})}
  }
  return json(res,404,{error:'NOT_FOUND'})
})

server.listen(PORT,()=>console.log(`NEO Teller reconciliation gateway listening on :${PORT}`))
