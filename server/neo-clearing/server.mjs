import http from 'node:http'
import {captureTrade,acceptTrade,buildPositions,bilateralNet,multilateralNet,calculateMargin,evaluateCollateral,createSettlementInstruction,recordSettlementEvidence,determineFinality,clearingSnapshot} from './fabric.mjs'

const PORT=Number(process.env.PORT||8808),TOKEN=String(process.env.NEO_CLEARING_OPERATOR_TOKEN||'')
const trades=[],instructions=[],evidence=[]
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}
export function createClearingServer(){return http.createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-clearing',trades:trades.length,instructions:instructions.length})
 if(req.method==='GET'&&url.pathname==='/v1/estate/clearing')return json(res,200,clearingSnapshot({trades,instructions,evidence}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&url.pathname==='/v1/trades'){const t=acceptTrade(captureTrade(await body(req)));trades.push(t);return json(res,201,t)}
 if(req.method==='GET'&&url.pathname==='/v1/positions')return json(res,200,{positions:buildPositions(trades)})
 if(req.method==='GET'&&url.pathname==='/v1/netting/bilateral')return json(res,200,{obligations:bilateralNet(trades)})
 if(req.method==='GET'&&url.pathname==='/v1/netting/multilateral')return json(res,200,{obligations:multilateralNet(trades)})
 if(req.method==='POST'&&url.pathname==='/v1/margin'){const i=await body(req),positions=buildPositions(trades),calls=calculateMargin({positions,...i});return json(res,200,{calls})}
 if(req.method==='POST'&&url.pathname==='/v1/collateral/evaluate'){const i=await body(req);return json(res,200,evaluateCollateral(i))}
 if(req.method==='POST'&&url.pathname==='/v1/settlement/instructions'){const i=createSettlementInstruction(await body(req));instructions.push(i);return json(res,201,i)}
 if(req.method==='POST'&&url.pathname==='/v1/settlement/evidence'){const i=await body(req),instruction=instructions.find(x=>x.instruction_id===i.instruction_id);if(!instruction)return json(res,404,{error:'instruction_not_found'});const e=recordSettlementEvidence({instruction,...i});evidence.push(e);return json(res,201,{evidence:e,finality:determineFinality({instruction,evidence})})}
 return json(res,404,{error:'not_found'})
}catch(error){return json(res,500,{error:'neo_clearing_error',detail:String(error?.message||error)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createClearingServer().listen(PORT,'0.0.0.0')
