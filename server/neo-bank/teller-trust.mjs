// NEOB-016: trusted-session authorization contract; the legacy Teller exposes only public network health.
// No customer session is trusted until a separately authenticated Teller issuer is deployed.
export function tellerSessionReadiness({issuerConfigured=false,verifierConfigured=false}={}){
 return {mode:'READ_ONLY',sessionVerification:issuerConfigured&&verifierConfigured?'CONFIGURED_NOT_ACTIVATED':'NOT_CONNECTED',customerSessionTrusted:false,canSign:false,canBroadcast:false};
}
export async function verifyTellerSession(assertion,{verifyIssuer}={}){
 if(typeof verifyIssuer!=='function')throw new Error('teller_issuer_not_configured');
 if(!assertion||typeof assertion!=='string'||assertion.length>8192)throw new Error('invalid_teller_assertion');
 const claims=await verifyIssuer(assertion); // Integration MUST verify issuer, audience, expiry and signature.
 if(!claims||claims.verified!==true||claims.audience!=='neo-bank'||!claims.subject||!claims.sessionId||claims.expiresAt<=Date.now())throw new Error('teller_session_invalid');
 return {subject:claims.subject,sessionId:claims.sessionId,verified:true,canSign:false,canBroadcast:false};
}
export function crownAnchorReadiness(){return {mode:'DISABLED',privateDigestStorage:true,externalPublisherConfigured:false,publishingAuthorized:false,onChainAnchored:false};}
