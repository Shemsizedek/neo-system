// NTEL-012 unmounted operator HTTP contract. Session tokens must come from
// trusted cookie/bearer middleware and origin verdict from trusted CSRF middleware.
export function createNeoTeleOperatorHttp({approve,summary,authenticate}={}){
 if([approve,summary,authenticate].some(x=>typeof x!=='function')) throw Error('adapter_required');
 const response=(status,body)=>({status,headers:{'cache-control':'no-store','content-type':'application/json'},body});
 return async function handle({method,path,sessionToken,originVerified=false,body={}}={}){
  try{
   const identity=await authenticate(sessionToken);
   if(!identity?.verified||!identity.subject||identity.operatorAuthorized!==true) return response(403,{error:'operator_access_denied'});
   if(method==='GET'&&path==='/neotele/v1/operator') return response(200,await summary({subject:identity.subject}));
   if(method==='POST'&&path==='/neotele/v1/operator/evidence/review'){
    if(!originVerified) return response(403,{error:'origin_not_verified'});
    if(typeof body?.reference!=='string'||!['APPROVED','REJECTED'].includes(body.decision)) return response(400,{error:'invalid_request'});
    const result=await approve({sessionToken,reference:body.reference,decision:body.decision,guardianAssertion:body.guardianAssertion,reviewEvidence:body.reviewEvidence});
    return response(200,result);
   }
   return response(404,{error:'route_not_found'});
  }catch{return response(400,{error:'request_rejected'});}
 };
}
