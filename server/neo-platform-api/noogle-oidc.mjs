import {randomBytes,createHash,createPrivateKey,createPublicKey} from 'node:crypto';
import {SignJWT,importJWK} from 'jose';
import {createNoogleNeopassProvider} from './noogle-neopass-provider.mjs';
const hash=v=>createHash('sha256').update(v).digest('base64url');
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const session=req=>{const values=String(req.headers.cookie||'').split(';').map(v=>v.trim()).filter(v=>v.startsWith('__Host-noogle-session='));return values.length===1?values[0].slice(22):null;};
export async function createNoogleOidcHandler({issuer,clients,store,accounts,pairwiseSecret,privateJwk,kid,now=Date.now}={}){
 const site=new URL(issuer);if(site.protocol!=='https:'||site.origin!==issuer||privateJwk?.kty!=='EC'||privateJwk.crv!=='P-256'||!privateJwk.d||typeof kid!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(kid)||typeof accounts?.authenticate!=='function'||typeof accounts?.active!=='function')throw Error('oidc_configuration_required');
 const publicJwk={...createPublicKey(createPrivateKey({key:privateJwk,format:'jwk'})).export({format:'jwk'}),alg:'ES256',use:'sig',kid};
 const signingKey=await importJWK(privateJwk,'ES256');
 const core=approve=>createNoogleNeopassProvider({clients,store,authenticate:token=>accounts.authenticate(token),approve,isActive:sub=>accounts.active(sub),pairwiseSecret,now});
 const inspect=core(async()=>false);
 const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','pragma':'no-cache'});res.end(JSON.stringify(data));};
 async function form(req){if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')throw Error('invalid_request');let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>8192)throw Error('invalid_request');}const params=new URLSearchParams(text);for(const key of params.keys())if(params.getAll(key).length!==1)throw Error('invalid_request');return Object.fromEntries(params);}
 return async(req,res)=>{
  const url=new URL(req.url,issuer),path=url.pathname;
  if(!['/.well-known/openid-configuration','/oidc/jwks','/oidc/authorize','/oidc/consent','/oidc/token'].includes(path))return false;
  try{
   if(req.method==='GET'&&path==='/.well-known/openid-configuration'){json(res,200,{issuer,authorization_endpoint:issuer+'/oidc/authorize',token_endpoint:issuer+'/oidc/token',jwks_uri:issuer+'/oidc/jwks',response_types_supported:['code'],grant_types_supported:['authorization_code'],subject_types_supported:['pairwise'],id_token_signing_alg_values_supported:['ES256'],scopes_supported:['openid'],token_endpoint_auth_methods_supported:['none'],code_challenge_methods_supported:['S256']});return true;}
   if(req.method==='GET'&&path==='/oidc/jwks'){json(res,200,{keys:[publicJwk]});return true;}
   if(req.method==='GET'&&path==='/oidc/authorize'){
    for(const name of url.searchParams.keys())if(url.searchParams.getAll(name).length!==1)throw Error('invalid_request');
    const input=Object.fromEntries(url.searchParams),view=inspect.inspect(input),token=session(req),identity=await accounts.authenticate(token);
    if(!identity?.verified){json(res,401,{error:'login_required'});return true;}
    const ticket=randomBytes(32).toString('base64url');await store.issue('consent:'+hash(ticket),{sessionHash:hash(token),input,expiresAt:now()+300000});
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"});
    res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Continue with Noogle NEOpass</title><h1>Continue to ${escape(view.clientName)}</h1><p>This site receives a private account identifier. Your wallet address, balance and roles are not shared.</p><form method="post" action="/oidc/consent"><input type="hidden" name="ticket" value="${ticket}"><button name="consent" value="allow">Continue with Noogle NEOpass</button><button name="consent" value="deny">Cancel</button></form></html>`);return true;
   }
   if(req.method==='POST'&&path==='/oidc/consent'){
    if(req.headers.origin!==issuer)throw Error('invalid_request');const body=await form(req),token=session(req);
    if(!token||typeof body.ticket!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(body.ticket)||Object.keys(body).some(k=>!['ticket','consent'].includes(k)))throw Error('invalid_request');
    const ticket=await store.take('consent:'+hash(body.ticket));if(!ticket||ticket.expiresAt<=now()||ticket.sessionHash!==hash(token))throw Error('invalid_request');
    if(body.consent!=='allow'){json(res,403,{error:'access_denied'});return true;}
    const result=await core(async()=>true).authorize(ticket.input,token);res.writeHead(303,{location:result.redirect,'cache-control':'no-store','referrer-policy':'no-referrer'});res.end();return true;
   }
   if(req.method==='POST'&&path==='/oidc/token'){
    const input=await form(req);if(input.grant_type!=='authorization_code'||Object.keys(input).some(k=>!['grant_type','code','client_id','redirect_uri','code_verifier'].includes(k)))throw Error('invalid_grant');
    const grant=await inspect.redeem(input),time=Math.floor(now()/1000),access=randomBytes(32).toString('base64url');
    const idToken=await new SignJWT({nonce:grant.nonce}).setProtectedHeader({alg:'ES256',kid,typ:'JWT'}).setIssuer(issuer).setSubject(grant.subject).setAudience(grant.audience).setIssuedAt(time).setExpirationTime(time+300).sign(signingKey);
    await store.issue('access:'+hash(access),{subject:grant.subject,audience:grant.audience,expiresAt:now()+300000});
    json(res,200,{access_token:access,token_type:'Bearer',expires_in:300,scope:'openid',id_token:idToken});return true;
   }
   json(res,405,{error:'invalid_request'});return true;
  }catch{json(res,400,{error:path==='/oidc/token'?'invalid_grant':'invalid_request'});return true;}
 };
}
