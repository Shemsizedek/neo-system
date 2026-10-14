/** NSEC-029. Read-only Guardian HTTP gateway on Node. No production login. */
import http from 'node:http';
import { verifyNoogleIdentity } from './identity-bridge.mjs';

export function makeGuardianHandler({secret,issuer='neo-pass',now=()=>Date.now()}={}) {
  return (req,res)=>{
    const url=new URL(req.url||'/', 'http://localhost');
    const method=req.method||'GET';
    const reply=(code,obj)=>{
      const body=JSON.stringify(obj);
      res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Length':Buffer.byteLength(body)});
      res.end(body);
    };
    if(method==='GET'&&url.pathname==='/api/guardian/health')
      return reply(200,{service:'neo-guardian',status:'ok',mode:'preproduction'});
    if(method==='GET'&&url.pathname==='/api/guardian/capabilities')
      return reply(200,{service:'neo-guardian',webauthn:'not_enabled',device_enrollment:'not_enabled',remote_terminal:'disabled'});
    if(method==='GET'&&url.pathname==='/api/guardian/session'){
      const header=String(req.headers.authorization||'');
      // Never accept tokens in URL query strings, arbitrary identity headers or cookies.
      const token=header.startsWith('Bearer ')?header.slice(7):'';
      const identity=verifyNoogleIdentity(token,{secret,issuer,now});
      return identity?reply(200,{authenticated:true,subject:identity.subject}):reply(401,{authenticated:false});
    }
    if(url.pathname.startsWith('/api/guardian/'))return reply(403,{error:'not_enabled'});
    return reply(404,{error:'not_found'});
  };
}
export function createGuardianServer(options={}) {
  return http.createServer(makeGuardianHandler(options));
}
// Deliberately no server.listen(): deployment requires separate approval.
