import {createServer} from 'node:http';
import {verifyWithChainRecheck} from './verification.mjs';
import {makeAuditEvent} from './audit.mjs';
const HASH=/^[a-f0-9]{64}$/i, ASSET=/^[A-Z0-9._-]{1,64}$/;
function reply(res,code,body){res.writeHead(code,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));}
export function createSecureEvidenceGateway({bitcoin,counterparty,authorize,historyStore,allowedAssets=[]}={}){
 if(!bitcoin?.getTransaction||!bitcoin?.recheckAnchor||!counterparty?.getIssuance||typeof authorize!=='function'||!historyStore?.append||!historyStore?.list)throw new Error('secure dependencies required');
 const allowed=new Set(allowedAssets);
 return createServer(async(req,res)=>{
  if(req.method!=='GET')return reply(res,405,{error:'method not allowed'});
  let operator;try{operator=await authorize(req)}catch{return reply(res,503,{error:'authentication unavailable'})}
  if(!operator?.allowed||!operator.subject)return reply(res,401,{error:'authentication required'});
  let url;try{url=new URL(req.url,'http://localhost')}catch{return reply(res,400,{error:'invalid request'})}
  if(url.pathname==='/health')return reply(res,200,{service:'neo-bmi',private:true,productionReady:false});
  const asset=url.searchParams.get('asset'),txid=url.searchParams.get('txid');
  if(!ASSET.test(asset||'')||!HASH.test(txid||'')||!allowed.has(asset))return reply(res,400,{error:'invalid or unapproved asset'});
  if([...url.searchParams.keys()].some(k=>!['asset','txid'].includes(k)))return reply(res,400,{error:'unexpected parameter'});
  if(url.pathname==='/v1/history'){
   try{const entries=await historyStore.list({assetId:asset,txid:txid.toLowerCase(),limit:50});return reply(res,200,{asset,txid,entries});}
   catch{return reply(res,503,{error:'history unavailable'})}
  }
  if(url.pathname!=='/v1/evidence')return reply(res,404,{error:'not found'});
  let evidence;try{evidence=await verifyWithChainRecheck({bitcoinTxid:txid.toLowerCase(),assetId:asset,classification:'BITCOIN_COUNTERPARTY_ASSET'},{bitcoin,counterparty})}
  catch{evidence={status:'NOT_VERIFIED',reason:'verification service unavailable'}}
  const event=makeAuditEvent({operatorId:operator.subject,assetId:asset,txid,evidence});
  let persisted;try{persisted=await historyStore.append(event);if(!persisted?.eventHash)throw new Error('missing persisted audit hash')}catch{return reply(res,503,{error:'audit persistence unavailable'})}
  return reply(res,200,{asset,txid:txid.toLowerCase(),...evidence,legalRights:'NOT_VERIFIED',reserveBacking:'NOT_VERIFIED',auditEventHash:persisted.eventHash});
 });
}
