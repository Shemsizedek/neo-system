// CASHFLOW-012: restricted operator API composition. OIDC verification is injected
// only from trusted middleware. This adapter does NOT implement JWT validation.
import {operatorAuthorized,draftOpportunity} from './neon-adapter.mjs';
const send=(res,status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));};
export function createStagingOperatorHandler({verifyIdentity,store,enabled=false}={}){
 return async (req,res)=>{
  if(!enabled||!store?.listMetadata||typeof verifyIdentity!=='function')
   return send(res,503,{error:'staging_not_configured'});
  if(req.method!=='GET'||req.url!=='/internal/leads')
   return send(res,404,{error:'route_not_found'});
  try{
   // Never trust request headers for identity; verifyIdentity must perform
   // JWT signature, issuer, audience, expiry, JWKS rotation and role checks.
   const identity=await verifyIdentity(req);
   if(!operatorAuthorized(identity))return send(res,403,{error:'operator_access_required'});
   const records=await store.listMetadata(25);
   return send(res,200,{leads:records});
  }catch{return send(res,403,{error:'operator_access_required'});}
 };
}
export function previewOpportunity(payload,type){
 const result=draftOpportunity({type,payload});
 return {status:'review_required',opportunity:result,maySend:false,mayExecute:false,mayCollectFunds:false};
}
