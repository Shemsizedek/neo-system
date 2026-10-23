import http from 'node:http'
import {createMerchant,registerDevice,createPaymentIntent,reviewPaymentIntent,attachSignature,createSettlementHandoff,finalizeMerchantPayment,createAssetAwareReceipt,merchantNetworkSnapshot} from './fabric.mjs'

const PORT=Number(process.env.PORT||8811),TOKEN=String(process.env.NEO_MERCHANT_NETWORK_OPERATOR_TOKEN||'')
const merchants=[],devices=[],intents=[],receipts=[]
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}
export function createMerchantNetworkServer(){return http.createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-merchant-network',merchants:merchants.length,devices:devices.length})
 if(req.method==='GET'&&url.pathname==='/v1/estate/merchant-network')return json(res,200,merchantNetworkSnapshot({merchants,devices,intents,receipts}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&url.pathname==='/v1/merchants'){const m=createMerchant(await body(req));merchants.push(m);return json(res,201,m)}
 if(req.method==='POST'&&url.pathname==='/v1/devices'){const d=registerDevice(await body(req));devices.push(d);return json(res,201,d)}
 if(req.method==='POST'&&url.pathname==='/v1/payment-intents'){const i=createPaymentIntent(await body(req));intents.push(i);return json(res,201,i)}
 const review=url.pathname.match(/^\/v1\/payment-intents\/([^/]+)\/review$/)
 if(req.method==='POST'&&review){const i=intents.find(x=>x.intent_id===decodeURIComponent(review[1]));if(!i)return json(res,404,{error:'intent_not_found'});const input=await body(req),d=devices.find(x=>x.device_id===i.device_id);Object.assign(i,reviewPaymentIntent(i,{guardian:input.guardian,assetRecord:input.asset_record,device:d}));return json(res,200,i)}
 const sign=url.pathname.match(/^\/v1\/payment-intents\/([^/]+)\/signature$/)
 if(req.method==='POST'&&sign){const i=intents.find(x=>x.intent_id===decodeURIComponent(sign[1]));if(!i)return json(res,404,{error:'intent_not_found'});Object.assign(i,attachSignature(i,await body(req)));return json(res,200,i)}
 const settle=url.pathname.match(/^\/v1\/payment-intents\/([^/]+)\/settlement$/)
 if(req.method==='POST'&&settle){const i=intents.find(x=>x.intent_id===decodeURIComponent(settle[1]));if(!i)return json(res,404,{error:'intent_not_found'});Object.assign(i,createSettlementHandoff(i,await body(req)));return json(res,200,i)}
 const final=url.pathname.match(/^\/v1\/payment-intents\/([^/]+)\/finalize$/)
 if(req.method==='POST'&&final){const i=intents.find(x=>x.intent_id===decodeURIComponent(final[1]));if(!i)return json(res,404,{error:'intent_not_found'});Object.assign(i,finalizeMerchantPayment(i,await body(req)));return json(res,200,i)}
 const receipt=url.pathname.match(/^\/v1\/payment-intents\/([^/]+)\/receipt$/)
 if(req.method==='POST'&&receipt){const i=intents.find(x=>x.intent_id===decodeURIComponent(receipt[1]));if(!i)return json(res,404,{error:'intent_not_found'});const m=merchants.find(x=>x.merchant_id===i.merchant_id),d=devices.find(x=>x.device_id===i.device_id);const r=createAssetAwareReceipt({payment:i,merchant:m,device:d,items:(await body(req)).items||[]});receipts.push(r);return json(res,201,r)}
 return json(res,404,{error:'not_found'})
}catch(error){return json(res,500,{error:'neo_merchant_network_error',detail:String(error?.message||error)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createMerchantNetworkServer().listen(PORT,'0.0.0.0')
