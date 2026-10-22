import http from 'node:http'
import {normalizeSignal,telemetrySample,buildServiceSlo,calculateCapacity,buildObservabilityState,createNocSnapshot} from './fabric.mjs'

const PORT=Number(process.env.PORT||8805),TOKEN=String(process.env.NEO_OBSERVABILITY_OPERATOR_TOKEN||'')
const samples=[],slos=[],capacities=[],signals=[]
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}
const state=()=>buildObservabilityState({samples,slos,capacities,thresholds:{availability:{min:.99,severity:'high'},latency_ms:{max:1500,severity:'high'}}})
export function createObservabilityServer(){return http.createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-observability',samples:samples.length})
 if(req.method==='GET'&&url.pathname==='/v1/estate/noc')return json(res,200,createNocSnapshot({state:state(),logs:signals.filter(x=>x.type==='LOG').length,traces:signals.filter(x=>x.type==='TRACE').length,audits:signals.filter(x=>x.type==='AUDIT').length}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&url.pathname==='/v1/telemetry'){const i=await body(req);samples.push(telemetrySample(i));return json(res,201,{ok:true})}
 if(req.method==='POST'&&url.pathname==='/v1/slo'){const i=await body(req);const s=buildServiceSlo(i);const idx=slos.findIndex(x=>x.service===s.service);if(idx>=0)slos[idx]=s;else slos.push(s);return json(res,201,s)}
 if(req.method==='POST'&&url.pathname==='/v1/capacity'){const i=await body(req),c={service:i.service,...calculateCapacity(i)};const idx=capacities.findIndex(x=>x.service===c.service);if(idx>=0)capacities[idx]=c;else capacities.push(c);return json(res,201,c)}
 if(req.method==='POST'&&url.pathname==='/v1/signals'){const i=await body(req),s=normalizeSignal(i);signals.push(s);return json(res,201,s)}
 return json(res,404,{error:'not_found'})
}catch(error){return json(res,500,{error:'neo_observability_error',detail:String(error?.message||error)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createObservabilityServer().listen(PORT,'0.0.0.0')
