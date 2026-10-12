import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { issueNeopassToken, verifyNeopassToken } from './neopass-google-auth.mjs';

export const GISS_CLIENT = 'gisd-office';
export const GISS_REDIRECT = 'https://gisd-office.shemsizedek.chatgpt.site/api/neopass/callback';
const scope = 'giss:academic:read';
const digest = value => createHash('sha256').update(value).digest('base64url');
const safe = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const json = (res,status,value) => {res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(value));};
const cookie = req => {try{return decodeURIComponent(String(req.headers.cookie||'').split(';').map(item=>item.trim()).find(item=>item.startsWith('__Host-neo_giss_return='))?.split('=').slice(1).join('=')||'');}catch{return '';}};
const clearReturn = '__Host-neo_giss_return=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
function parameters(params) {
  for(const key of ['client_id','redirect_uri','state','code_challenge','code_challenge_method'])if(params.getAll(key).length!==1)throw Error('invalid_authorization_request');
  const value=Object.fromEntries(params);
  if(value.client_id!==GISS_CLIENT||value.redirect_uri!==GISS_REDIRECT||value.code_challenge_method!=='S256'||!/^[A-Za-z0-9_-]{43}$/.test(value.code_challenge)||!/^[A-Za-z0-9_-]{32,128}$/.test(value.state))throw Error('invalid_authorization_request');
  return value;
}
async function form(req) {
  let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>6000)throw Error('request_too_large');}
  return new URLSearchParams(raw);
}
export function createFirestoreGissCodeStore({db}) {
  const collection=db.collection('gissAuthorizationCodes');
  return {
    async issue(code,record){await collection.doc(digest(code)).create({...record,expiresAt:new Date(record.expiresMs)});},
    async consume(code){const ref=collection.doc(digest(code));return db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists)return null;const value=snap.data();tx.delete(ref);return value;});},
  };
}
export function createGissAuthorizationBridge({codeStore,authService,subjectResolver,gissService,jwtSecret,jwtIssuer='neo-pass',now=()=>Date.now()}) {
  if(!codeStore||!authService||!subjectResolver||!gissService||!jwtSecret)throw Error('giss_bridge_configuration_required');
  const bridgeSecret=createHmac('sha256',jwtSecret).update('giss-authorization-bridge-signing-v1').digest('hex');
  const clock=()=>{const value=now();return typeof value==='number'?value:Date.parse(value);};
  return async (req,res,url=new URL(req.url||'/','https://egov.holytemples.org'))=>{
    if(req.method==='GET'&&url.pathname==='/portal'&&cookie(req)) {
      const next=cookie(req);res.setHeader('set-cookie',clearReturn);
      try{const target=new URL(next,'https://egov.holytemples.org');if(target.origin==='https://egov.holytemples.org'&&target.pathname==='/auth/giss/authorize'){parameters(target.searchParams);if(subjectResolver(req)){res.writeHead(303,{location:target.pathname+target.search});res.end();return true;}}}catch{}
    }
    if(!url.pathname.startsWith('/auth/giss/'))return false;
    try {
      if(url.pathname==='/auth/giss/authorize'&&['GET','POST'].includes(req.method)) {
        const requested=parameters(url.searchParams);
        const subject=subjectResolver(req);
        if(!subject){res.setHeader('set-cookie',`__Host-neo_giss_return=${encodeURIComponent(url.pathname+url.search)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);res.writeHead(303,{location:'/'});res.end();return true;}
        const member=await authService.session(subject,req.neopassClaims||{});
        if(member.neopassStatus!=='active'||!member.email)return json(res,403,{error:'active_neopass_required'}),true;
        if(req.method==='GET') {
          const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Connect NEOpass to GISS</title><style>body{margin:0;background:#0c231c;color:#f6f3e7;font:18px/1.55 system-ui}main{max-width:600px;margin:8vh auto;padding:30px}h1{font:700 36px Georgia}button,a{display:inline-block;padding:12px 18px;border-radius:8px}button{background:#dfc179;border:0;font:700 18px system-ui;color:#10251c}a{color:inherit}</style><main><p>WORLD TEMPLE · NEOPASS</p><h1>Connect your academic records</h1><p>Signed in as ${safe(member.email)}.</p><p>GISS will receive your verified member identity and read your Temple enrollment, portfolio, and council records. This connection cannot change those records or grant a new school role.</p><form method="post" action="${safe(url.pathname+url.search)}"><input type="hidden" name="consent" value="allow"><button>Connect to GISS</button></form><a href="/portal">Return to the member portal</a></main></html>`;
          res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",'referrer-policy':'no-referrer'});res.end(html);return true;
        }
        if(req.headers.origin!=='https://egov.holytemples.org'||req.headers['sec-fetch-site']==='cross-site')return json(res,403,{error:'cross_site_request_blocked'}),true;
        if((await form(req)).get('consent')!=='allow')return json(res,400,{error:'consent_required'}),true;
        const code=randomBytes(32).toString('base64url');
        await codeStore.issue(code,{subject,email:member.email.toLowerCase(),clientId:requested.client_id,redirectUri:requested.redirect_uri,challenge:requested.code_challenge,expiresMs:clock()+120000});
        const target=new URL(requested.redirect_uri);target.searchParams.set('code',code);target.searchParams.set('state',requested.state);
        res.writeHead(303,{location:target.href,'cache-control':'no-store','referrer-policy':'no-referrer'});res.end();return true;
      }
      if(url.pathname==='/auth/giss/token'&&req.method==='POST') {
        const input=await form(req);
        for(const key of ['code','code_verifier','client_id','redirect_uri'])if(input.getAll(key).length!==1)return json(res,400,{error:'invalid_grant'}),true;
        if(input.get('client_id')!==GISS_CLIENT||input.get('redirect_uri')!==GISS_REDIRECT||!/^[A-Za-z0-9_-]{43}$/.test(input.get('code')||'')||!/^[A-Za-z0-9_-]{43,128}$/.test(input.get('code_verifier')||''))return json(res,400,{error:'invalid_grant'}),true;
        const grant=await codeStore.consume(input.get('code'));
        const actual=Buffer.from(digest(input.get('code_verifier'))),expected=Buffer.from(grant?.challenge||'');
        if(!grant||grant.expiresMs<=clock()||grant.clientId!==GISS_CLIENT||grant.redirectUri!==GISS_REDIRECT||actual.length!==expected.length||!timingSafeEqual(actual,expected))return json(res,400,{error:'invalid_grant'}),true;
        const expiresIn=900;
        const accessToken=issueNeopassToken({subject:grant.subject,secret:bridgeSecret,issuer:jwtIssuer,now:clock,ttlSeconds:expiresIn,claims:{token_use:'giss-bridge',scope,aud:GISS_CLIENT,email:grant.email}});
        json(res,200,{access_token:accessToken,token_type:'Bearer',expires_in:expiresIn,scope,member:{subject:grant.subject,email:grant.email}});return true;
      }
      if(url.pathname==='/auth/giss/records'&&req.method==='GET') {
        const token=String(req.headers.authorization||'').startsWith('Bearer ')?req.headers.authorization.slice(7):'';
        const claims=verifyNeopassToken(token,{secret:bridgeSecret,issuer:jwtIssuer,now:clock});
        if(!claims||!Number.isFinite(claims.exp)||claims.exp<=clock()/1000||claims.token_use!=='giss-bridge'||claims.scope!==scope||claims.aud!==GISS_CLIENT)return json(res,401,{error:'giss_connection_required'}),true;
        json(res,200,{subject:claims.sub,...await gissService.readState(claims.sub)});return true;
      }
      if(url.pathname==='/auth/giss/status'&&req.method==='GET'){json(res,200,{configured:true,clientId:GISS_CLIENT,redirectUri:GISS_REDIRECT,scope});return true;}
      json(res,405,{error:'method_not_allowed'});return true;
    }catch(error){json(res,error.status||400,{error:error.code||'giss_authorization_failed'});return true;}
  };
}
