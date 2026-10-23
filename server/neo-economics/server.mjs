import http from 'node:http'
import {createCostModel,estimateWorkloadCost,createLicenseEntitlement,createReservation,createChargebackEntry,createCapacityOffer,economicSnapshot} from './fabric.mjs'

const PORT=Number(process.env.PORT||8807),TOKEN=String(process.env.NEO_ECONOMICS_OPERATOR_TOKEN||'')
let costModel=createCostModel()
const licenses=[],reservations=[],offers=[],chargebacks=[]
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}
export function createEconomicsServer(){return http.createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-economics'})
 if(req.method==='GET'&&url.pathname==='/v1/estate/economics')return json(res,200,economicSnapshot({licenses,reservations,offers,chargebacks}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&url.pathname==='/v1/cost-model'){costModel=createCostModel(await body(req));return json(res,200,costModel)}
 if(req.method==='POST'&&url.pathname==='/v1/cost/estimate'){const i=await body(req);return json(res,200,estimateWorkloadCost({...i,costModel}))}
 if(req.method==='POST'&&url.pathname==='/v1/licenses'){const l=createLicenseEntitlement(await body(req));licenses.push(l);return json(res,201,l)}
 if(req.method==='POST'&&url.pathname==='/v1/reservations'){const r=createReservation(await body(req));reservations.push(r);return json(res,201,r)}
 if(req.method==='POST'&&url.pathname==='/v1/capacity-offers'){const o=createCapacityOffer(await body(req));offers.push(o);return json(res,201,o)}
 if(req.method==='POST'&&url.pathname==='/v1/chargebacks'){const c=createChargebackEntry(await body(req));chargebacks.push(c);return json(res,201,c)}
 return json(res,404,{error:'not_found'})
}catch(error){return json(res,500,{error:'neo_economics_error',detail:String(error?.message||error)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createEconomicsServer().listen(PORT,'0.0.0.0')
