import http from 'node:http'
import {createAssetMaster,createOwnershipRecord,createCustodyAccount,bindDevice,initiateTransfer,authorizeTransfer,observeTransfer,updateRegisterAfterTransfer,createCorporateAction,calculateCorporateActionEntitlements,assetRegistrySnapshot} from './fabric.mjs'

const PORT=Number(process.env.PORT||8809),TOKEN=String(process.env.NEO_ASSETS_OPERATOR_TOKEN||'')
const assets=[],ownership=[],custodyAccounts=[],devices=[],transfers=[],corporateActions=[]
const json=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify(body))}
const auth=req=>TOKEN&&String(req.headers.authorization||'')===`Bearer ${TOKEN}`
const body=async req=>{const chunks=[];for await(const c of req)chunks.push(c);return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{}}
export function createAssetsServer(){return http.createServer(async(req,res)=>{try{
 const url=new URL(req.url||'/','http://neo.local')
 if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-assets',assets:assets.length})
 if(req.method==='GET'&&url.pathname==='/v1/estate/assets')return json(res,200,assetRegistrySnapshot({assets,ownership,custodyAccounts,devices,transfers,corporateActions}))
 if(!auth(req))return json(res,401,{error:'operator_auth_required'})
 if(req.method==='POST'&&url.pathname==='/v1/assets'){const a=createAssetMaster(await body(req));assets.push(a);return json(res,201,a)}
 if(req.method==='POST'&&url.pathname==='/v1/ownership'){const o=createOwnershipRecord(await body(req));ownership.push(o);return json(res,201,o)}
 if(req.method==='POST'&&url.pathname==='/v1/custody-accounts'){const a=createCustodyAccount(await body(req));custodyAccounts.push(a);return json(res,201,a)}
 if(req.method==='POST'&&url.pathname==='/v1/device-bindings'){const d=bindDevice(await body(req));devices.push(d);return json(res,201,d)}
 if(req.method==='POST'&&url.pathname==='/v1/transfers'){const t=initiateTransfer(await body(req));transfers.push(t);return json(res,201,t)}
 const authz=url.pathname.match(/^\/v1\/transfers\/([^/]+)\/authorize$/)
 if(req.method==='POST'&&authz){const t=transfers.find(x=>x.transfer_id===decodeURIComponent(authz[1]));if(!t)return json(res,404,{error:'transfer_not_found'});const i=await body(req),o=ownership.find(x=>x.record_id===i.ownership_record_id);const next=authorizeTransfer(t,{ownership:o,eligible:i.eligible!==false,approved:i.approved===true});Object.assign(t,next);return json(res,200,t)}
 const ev=url.pathname.match(/^\/v1\/transfers\/([^/]+)\/evidence$/)
 if(req.method==='POST'&&ev){const t=transfers.find(x=>x.transfer_id===decodeURIComponent(ev[1]));if(!t)return json(res,404,{error:'transfer_not_found'});Object.assign(t,observeTransfer(t,await body(req)));return json(res,200,t)}
 const reg=url.pathname.match(/^\/v1\/transfers\/([^/]+)\/register$/)
 if(req.method==='POST'&&reg){const t=transfers.find(x=>x.transfer_id===decodeURIComponent(reg[1]));if(!t)return json(res,404,{error:'transfer_not_found'});const i=await body(req),from=ownership.find(x=>x.record_id===i.from_record_id),to=ownership.find(x=>x.record_id===i.to_record_id);const r=updateRegisterAfterTransfer({transfer:t,fromRecord:from,toRecord:to});Object.assign(from,r.from);Object.assign(to,r.to);Object.assign(t,r.transfer,{state:'FINAL'});return json(res,200,{transfer:t,from,to})}
 if(req.method==='POST'&&url.pathname==='/v1/corporate-actions'){const a=createCorporateAction(await body(req));corporateActions.push(a);return json(res,201,{action:a,entitlements:calculateCorporateActionEntitlements({action:a,holders:ownership.filter(x=>x.asset_id===a.asset_id)})})}
 return json(res,404,{error:'not_found'})
}catch(error){return json(res,500,{error:'neo_assets_error',detail:String(error?.message||error)})}})}
if(import.meta.url===`file://${process.argv[1]}`)createAssetsServer().listen(PORT,'0.0.0.0')
