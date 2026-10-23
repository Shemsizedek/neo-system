// NEO-WIRE-005L: staging HTTP adapter, intentionally not mounted to production.
// Routes require POST, JSON, and authenticated session checks in the handler.
const actions=new Map([
 ['/api/wire/passkeys/registration/begin','registration.begin'],
 ['/api/wire/passkeys/registration/finish','registration.finish'],
 ['/api/wire/passkeys/authentication/begin','authentication.begin'],
 ['/api/wire/passkeys/authentication/finish','authentication.finish']
]);
export function createWirePasskeyHttpAdapter({handler,maxBytes=16384}={}) {
 if(typeof handler!=='function') throw new Error('wire_passkey_handler_required');
 return async function route(req,res) {
  const pathname=new URL(req.url||'/', 'http://localhost').pathname;
  const action=actions.get(pathname);
  if(!action) return false;
  const send=(status,body)=>{
   const json=JSON.stringify(body);
   res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','pragma':'no-cache','x-content-type-options':'nosniff','content-length':Buffer.byteLength(json)});
   res.end(json);
  };
  if(req.method!=='POST') {send(405,{error:'method_not_allowed'});return true}
  if(String(req.headers?.['content-type']||'').split(';')[0].trim().toLowerCase()!=='application/json') {
   send(415,{error:'json_required'});return true;
  }
  let chunks=[],size=0;
  try {
   for await(const chunk of req) {
    size+=chunk.length;
    if(size>maxBytes) {send(413,{error:'payload_too_large'});return true}
    chunks.push(chunk);
   }
   const payload=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(!payload||typeof payload!=='object'||Array.isArray(payload)) {send(400,{error:'invalid_json_object'});return true}
   const result=await handler({req,action,payload});
   send(result.status,result.body);
  } catch {
   if(!res.headersSent) send(400,{error:'passkey_request_rejected'});
  }
  return true;
 };
}
