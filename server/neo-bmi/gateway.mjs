import { createServer } from 'node:http';
import { verifyWithChainRecheck } from './verification.mjs';
const HASH=/^[a-f0-9]{64}$/i, ASSET=/^[A-Z0-9._-]{1,64}$/;
function send(res,status,payload){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(payload));}
export function createEvidenceGateway({bitcoin,counterparty,allowedAssets=[],maxRequests=200}={}){
 if(!bitcoin?.getTransaction||!bitcoin?.recheckAnchor||!counterparty?.getIssuance)throw Error('read-only verification adapters required');
 const allow=new Set(allowedAssets);let used=0;
 return createServer(async(req,res)=>{
  if(req.method!=='GET')return send(res,405,{error:'method not allowed'});
  if(++used>maxRequests)return send(res,429,{error:'request budget exceeded'});
  let u;try{u=new URL(req.url,'http://localhost')}catch{return send(res,400,{error:'bad request'})}
  if(u.pathname==='/health')return send(res,200,{service:'neo-bmi-evidence',mode:'read-only',productionReady:false});
  if(u.pathname!=='/v1/evidence'||[...u.searchParams.keys()].some(k=>!['txid','asset'].includes(k)))return send(res,404,{error:'not found'});
  const txid=u.searchParams.get('txid'),asset=u.searchParams.get('asset');
  if(!HASH.test(txid||'')||!ASSET.test(asset||'')||!allow.has(asset))return send(res,400,{error:'request outside approved scope'});
  try{
   const result=await verifyWithChainRecheck({bitcoinTxid:txid.toLowerCase(),assetId:asset,classification:'BITCOIN_COUNTERPARTY_ASSET'},{bitcoin,counterparty});
   return send(res,200,{schema:'neo.bmi.evidence.v1',asset,txid:txid.toLowerCase(),...result,issuerControl:'NOT_VERIFIED',legalRights:'NOT_VERIFIED',reserveBacking:'NOT_VERIFIED',consensusAssurance:'PROVIDER_CORRELATION_ONLY'});
  }catch{return send(res,503,{status:'NOT_VERIFIED',error:'verification unavailable'})}
 });
}
