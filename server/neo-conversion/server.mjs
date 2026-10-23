import http from 'node:http'
import {normalizeQuote,buildVerifiedReference,chooseLiquidityRoute,createConversionIntent,quoteConversion,authorizeConversion,recordExecution,conversionSnapshot} from './fabric.mjs'
const PORT=Number(process.env.PORT||8813),TOKEN=String(process.env.NEO_CONVERSION_OPERATOR_TOKEN||'')
const quotes=[],intents=[],executions=[]
const json=(res,s,b)=>{res.writeHead(s,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(b))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const c=[];for await(const x of req)c.push(x);return c.length?JSON.parse(Buffer.concat(c).toString('utf8')):{}}
export function createConversionServer(){return http.createServer(async(req,res)=>{try{
 const u=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&u.pathname==='/health')return json(res,200,{ok:true,service:'neo-conversion',quotes:quotes.length})
 if(req.method==='GET'&&u.pathname==='/v1/estate/conversion')return json(res,200,conversionSnapshot({quotes,intents,executions}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&u.pathname==='/v1/quotes'){const q=normalizeQuote(await body(req));quotes.push(q);return json(res,201,q)}
 if(req.method==='POST'&&u.pathname==='/v1/intents'){const i=createConversionIntent(await body(req));intents.push(i);return json(res,201,i)}
 const qp=u.pathname.match(/^\/v1\/intents\/([^/]+)\/quote$/);if(req.method==='POST'&&qp){const i=intents.find(x=>x.intent_id===decodeURIComponent(qp[1]));if(!i)return json(res,404,{error:'intent_not_found'});const b=await body(req),ref=buildVerifiedReference({quotes,baseAsset:i.from_asset,quoteAsset:i.to_asset,maxAgeMs:b.max_age_ms||120000}),route=chooseLiquidityRoute({reference:ref,offers:b.offers||[],maxSpreadBps:i.max_spread_bps,maxSlippageBps:i.max_slippage_bps});Object.assign(i,quoteConversion(i,{reference:ref,route}));return json(res,200,i)}
 const au=u.pathname.match(/^\/v1\/intents\/([^/]+)\/authorize$/);if(req.method==='POST'&&au){const i=intents.find(x=>x.intent_id===decodeURIComponent(au[1]));Object.assign(i,authorizeConversion(i,{approved:true}));return json(res,200,i)}
 const ex=u.pathname.match(/^\/v1\/intents\/([^/]+)\/execution$/);if(req.method==='POST'&&ex){const i=intents.find(x=>x.intent_id===decodeURIComponent(ex[1]));const done=recordExecution(i,await body(req));Object.assign(i,done);executions.push(cloneSafe(done));return json(res,200,done)}
 return json(res,404,{error:'not_found'})
}catch(e){return json(res,500,{error:'neo_conversion_error',detail:String(e?.message||e)})}})}
function cloneSafe(v){return JSON.parse(JSON.stringify(v))}
if(import.meta.url===`file://${process.argv[1]}`)createConversionServer().listen(PORT,'0.0.0.0')
