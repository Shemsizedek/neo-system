import {randomUUID} from 'node:crypto';
/**
 * Provider-neutral authorization exchange boundary.
 * The exchange is not a public endpoint: it requires an authorized service caller,
 * an actual issuer-backed session verifier, and an issuer-owned grant signer.
 */
export function createMailTokenExchange({verifySession,issueGrant,isRevoked,now=()=>Math.floor(Date.now()/1000)}={}){
  if([verifySession,issueGrant,isRevoked].some(fn=>typeof fn!=='function'))throw Error('exchange_dependencies_required');
  return async function exchange({sessionToken,mailbox,requester}={}){
    if(typeof sessionToken!=='string'||!sessionToken||typeof mailbox!=='string'||!mailbox || typeof requester!=='string'||!requester)return {ok:false,reason:'invalid_request'};
    let session;
    try{session=await verifySession(sessionToken);}catch{return {ok:false,reason:'identity_unavailable'};}
    if(!session?.subject||session.subject!==requester||session.active!==true||!Array.isArray(session.mailboxes)||!session.mailboxes.includes(mailbox))return {ok:false,reason:'access_denied'};
    if(typeof session.sessionId!=='string'||!session.sessionId)return {ok:false,reason:'missing_session_id'};
    try{if(await isRevoked(session.sessionId,session.subject))return {ok:false,reason:'session_revoked'};}catch{return {ok:false,reason:'revocation_unavailable'};}
    const issuedAt=now();
    const claims={sub:session.subject,aud:'neo-mail',token_use:'mail-access',scope:'mail:read',mailbox,jti:randomUUID(),iat:issuedAt,exp:issuedAt+300};
    try{
      const grant=await issueGrant(claims);
      if(typeof grant!=='string'||!grant)return {ok:false,reason:'issuer_unavailable'};
      return {ok:true,grant,expiresIn:300};
    }catch{return {ok:false,reason:'issuer_unavailable'};}
  };
}
