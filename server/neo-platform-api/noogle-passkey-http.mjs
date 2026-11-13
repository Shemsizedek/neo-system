import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('./noogle-passkey-page.html',import.meta.url));
const js=readFileSync(new URL('./noogle-passkey-browser.js',import.meta.url));
const css=readFileSync(new URL('./noogle-passkey.css',import.meta.url));
const valid=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{43}$/.test(v);
const cookie=(req,name)=>{const matches=String(req.headers.cookie||'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));return matches.length===1?matches[0].slice(name.length+1):null;};
const setCookie=(name,value,age)=>`${name}=${value}; Path=/; Secure; HttpOnly; SameSite=Strict; Max-Age=${age}`;
// Explicit factory only. Shared ingress rate limiting and TLS are deployment requirements.
export function createNooglePasskeyServer({origin,accounts,allowRegistration=false,oidcHandler,now=Date.now}={}){
 const url=new URL(origin);if(url.protocol!=='https:'||url.origin!==origin||!accounts||['beginRegistration','finishRegistration','beginLogin','finishLogin','authenticate','signOut'].some(k=>typeof accounts[k]!=='function'))throw Error('passkey_http_configuration_required');
 const limits=new Map();
 return http.createServer(async(req,res)=>{
  const send=(status,data,type='application/json')=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'",'permissions-policy':'camera=(), microphone=(), geolocation=()'});res.end(type==='application/json'?JSON.stringify(data):data);};
  try{
   if(oidcHandler&&await oidcHandler(req,res))return;
   const path=new URL(req.url,origin).pathname;
   if(req.method==='GET'&&path==='/'){
    if(!valid(cookie(req,'__Host-noogle-browser')))res.setHeader('set-cookie',setCookie('__Host-noogle-browser',randomBytes(32).toString('base64url'),1800));
    return send(200,html,'text/html; charset=utf-8');
   }
   if(req.method==='GET'&&path==='/passkey.js')return send(200,js,'text/javascript; charset=utf-8');
   if(req.method==='GET'&&path==='/passkey.css')return send(200,css,'text/css; charset=utf-8');
   if(req.method==='GET'&&path==='/api/session')return send(200,{authenticated:Boolean(await accounts.authenticate(cookie(req,'__Host-noogle-session'))),registrationEnabled:allowRegistration});
   if(req.method!=='POST'||!['/api/register/options','/api/register/verify','/api/login/options','/api/login/verify','/api/logout'].includes(path))return send(404,{error:'not_found'});
   if(req.headers.origin!==origin||req.headers['x-noogle-passkey']!=='1'||req.headers['content-type']?.split(';')[0]!=='application/json')return send(403,{error:'same_origin_required'});
   const browser=cookie(req,'__Host-noogle-browser');if(!valid(browser))return send(401,{error:'browser_session_required'});
   const time=now();for(const [key,row]of limits)if(row.until<=time)limits.delete(key);
   if(!limits.has(browser)){if(limits.size>=1000)return send(503,{error:'try_later'});limits.set(browser,{count:0,until:time+300000});}
   if(++limits.get(browser).count>30)return send(429,{error:'too_many_requests'});
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536)return send(413,{error:'request_too_large'});chunks.push(chunk);}
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{return send(400,{error:'invalid_json'});}
   if(!body||Array.isArray(body)||typeof body!=='object'||Object.keys(body).some(k=>!['id','response'].includes(k)))return send(400,{error:'invalid_body'});
   if(path.startsWith('/api/register/')&&!allowRegistration)return send(403,{error:'registration_not_enabled'});
   if(path==='/api/register/options')return send(200,await accounts.beginRegistration(browser));
   if(path==='/api/register/verify')return send(200,await accounts.finishRegistration(browser,body));
   if(path==='/api/login/options')return send(200,await accounts.beginLogin(browser));
   if(path==='/api/login/verify'){
    const result=await accounts.finishLogin(browser,body);
    if(!valid(result?.sessionHandle)||!Number.isFinite(result.expiresAt)||result.expiresAt<=time)throw Error('invalid_session');
    res.setHeader('set-cookie',setCookie('__Host-noogle-session',result.sessionHandle,Math.min(900,Math.floor((result.expiresAt-time)/1000))));
    return send(200,{authenticated:true});
   }
   await accounts.signOut(cookie(req,'__Host-noogle-session'));res.setHeader('set-cookie',setCookie('__Host-noogle-session','',0));return send(200,{authenticated:false});
  }catch{return send(400,{error:'passkey_operation_rejected'});}
 });
}
