import { sessionCookie } from './neopass-google-auth.mjs';

const COOKIE = '__Host-neo_pass_ceremony';
const cookie = value => `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${value ? 300 : 0}`;
const readCookie = req => String(req.headers.cookie || '').split(';').map(v=>v.trim()).find(v=>v.startsWith(COOKIE+'='))?.slice(COOKIE.length+1) || '';
function send(res,status,value) {
  const body=JSON.stringify(value);
  res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','content-length':Buffer.byteLength(body)});
  res.end(body);
}
async function readBody(req) {
  if (!String(req.headers['content-type']||'').startsWith('application/json')) throw Error('passkey_json_required');
  const chunks=[]; let size=0;
  for await (const chunk of req) { size+=Buffer.byteLength(chunk); if(size>65536) throw Error('passkey_request_too_large'); chunks.push(Buffer.from(chunk)); }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}
export function createPasskeyHttpHandler({auth=null,now=Date.now}={}) {
  const attempts=new Map();
  return async (req,res,url) => {
    if(['/auth/google/continue','/api/v1/auth/google'].includes(url.pathname)) {
      send(res,410,{error:'google_login_removed',message:'Use your NEOpass device passkey.'}); return true;
    }
    if(url.pathname==='/api/v1/auth/passkeys/status' && req.method==='GET') {
      send(res,200,{provider:'NEOpass',configured:Boolean(auth),deviceOnly:true,googleRequired:false}); return true;
    }
    if(!url.pathname.startsWith('/api/v1/auth/passkeys/')) return false;
    if(req.method!=='POST') { send(res,405,{error:'method_not_allowed'}); return true; }
    if(!auth) { send(res,503,{error:'neopass_passkey_storage_unavailable',message:'NEOpass passkey storage is not configured yet.'}); return true; }
    if(req.headers.origin!==auth.origin || ['cross-site','same-site'].includes(req.headers['sec-fetch-site'])) { send(res,403,{error:'passkey_origin_not_allowed'}); return true; }
    const time=now(), key=String(req.socket.remoteAddress||'unknown');
    for(const [ip,entry] of attempts) if(entry.until<=time) attempts.delete(ip);
    const entry=attempts.get(key)||{count:0,until:time+60000};
    if(entry.count>=30 || (!attempts.has(key)&&attempts.size>=10000)) { send(res,429,{error:'passkey_rate_limited'}); return true; }
    entry.count++; attempts.set(key,entry);
    try {
      const body=await readBody(req), handle=readCookie(req);
      let result;
      switch(url.pathname) {
        case '/api/v1/auth/passkeys/register/options': {
          const subject=auth.subjectResolver(req);
          if(subject && (!Number.isFinite(req.neopassClaims?.iat) || time/1000-req.neopassClaims.iat>300)) throw Error('passkey_reauthentication_required');
          result=await auth.registrationOptions({username:body.username,displayName:body.displayName,subject});
          res.setHeader('set-cookie',cookie(result.handle)); send(res,200,result.options); return true;
        }
        case '/api/v1/auth/passkeys/authenticate/options':
          result=await auth.authenticationOptions();
          res.setHeader('set-cookie',cookie(result.handle)); send(res,200,result.options); return true;
        case '/api/v1/auth/passkeys/register/verify':
          result=await auth.register(handle,body,auth.subjectResolver(req)); break;
        case '/api/v1/auth/passkeys/authenticate/verify':
          result=await auth.authenticate(handle,body); break;
        default: send(res,404,{error:'not_found'}); return true;
      }
      res.setHeader('set-cookie',[sessionCookie(result.token),cookie('')]);
      send(res,200,{authenticated:true,member:result.member});
    } catch(error) {
      // No raw library errors, SQL, assertions, or credential material in responses/logs.
      const safe=new Set(['passkey_username_invalid','passkey_display_name_invalid','passkey_username_unavailable','device_bound_passkey_required','passkey_request_too_large','passkey_reauthentication_required']);
      send(res,400,{error:safe.has(error.message)?error.message:'passkey_verification_failed'});
    }
    return true;
  };
}
