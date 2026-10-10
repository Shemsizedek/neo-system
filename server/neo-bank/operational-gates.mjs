// NEOB-020: approval does not confer publication authority.
// A real Crown publisher must supply verified deployment-specific authorization and receipt checks.
export function publicationDecision(request,{authorized=false,publisher}={}){
 if(!request||request.status!=='APPROVED'||request.approved!==true||request.submitted!==false)throw new Error('crown_request_not_publishable');
 if(!/^sha256:[a-f0-9]{64}$/.test(request.digest||''))throw new Error('invalid_attestation');
 if(!authorized||typeof publisher!=='function')throw new Error('crown_publisher_not_authorized');
 return {status:'READY_FOR_OPERATOR_REVIEW',digest:request.digest,canBroadcast:false};
}
export async function tellerIdentityBridge(token,{verifyAssertion,consume,expectedSubject}={}){
 if(typeof verifyAssertion!=='function'||typeof consume!=='function')throw new Error('teller_bridge_not_configured');
 const claims=await verifyAssertion(token);
 if(!claims||claims.verified!==true||claims.subject!==expectedSubject)throw new Error('teller_session_invalid');
 const result=await consume(expectedSubject,claims);
 if(result?.verified!==true)throw new Error('teller_session_invalid');
 return {verified:true,sessionId:result.sessionId,canSign:false,canBroadcast:false};
}
