// One-shot, non-transactional CES administrator authentication preflight.
// Invokes the existing protected read-only auth check on loopback only.
// No secrets, cookies, source HTML or account data are logged or persisted.
const stages=new Set(['configuration','login_page','login_submit','member_page','admin_transition','admin_page','other_ces_page']);
const reasons=new Set(['login_contract_mismatch','admin_transition_missing','admin_transition_rejected','admin_redirect_rejected','admin_session_unavailable','admin_proof_missing','protected-page-verification-required','untrusted-protected-page','login-response-rejected','missing-login-redirect','untrusted-login-redirect','login-redirect-mismatch','protected-page-unavailable','untrusted-protected-response','login-form-returned','protected-page-marker-missing','request_unavailable','response_unverified', 'upstream_access_denied', 'login_page_unavailable']);

export async function runCesAdminLoginPreflight({
 port,token,fetchImpl=fetch,logger=entry=>console.info(JSON.stringify(entry))
}={}){
 const emit=(out)=>{logger({event:'ces_nmni_auth_preflight',...out});return out};
 const portNumber=Number(port);
 if(!Number.isSafeInteger(portNumber)||portNumber<1||portNumber>65535||typeof token!=='string'||token.length<32){
   return emit({result:'configuration_missing'});
 }
 try{
   const response=await fetchImpl('http://127.0.0.1:'+portNumber+'/v1/auth/check',{
     method:'POST',
     headers:{authorization:'Bearer '+token,accept:'application/json'},
     redirect:'manual',signal:AbortSignal.timeout(110000)
   });
   if(response.status===200){
     const body=await response.json();
     const proof=body?.proof;
     if(proof?.exchangeId==='NMNI'&&proof?.memberAuthenticated===true&&proof?.adminAuthenticated===true&&Number.isFinite(Date.parse(proof.verifiedAt||''))){
       return emit({result:'verified',memberAuthenticated:true,adminAuthenticated:true});
     }
     return emit({result:'unverified'});
   }
   if(response.status===503)return emit({result:'configuration_missing',httpStatus:503});
   if(response.status===409)return emit({result:'already_in_progress',httpStatus:409});
   if(response.status===502){
     let body;
     try{body=await response.json()}catch{}
     const diag=body?.diagnostic;
     return emit({result:'failed',httpStatus:502,
       ...(stages.has(diag?.stage)?{stage:diag.stage}:{}),
       ...(reasons.has(diag?.reason)?{reason:diag.reason}:{})
     });
   }
   return emit({result:'failed',httpStatus:Number(response.status)||0});
 }catch{return emit({result:'transport_unavailable'})}
}
