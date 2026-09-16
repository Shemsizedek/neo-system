import http from 'node:http';
import crypto from 'node:crypto';

export const SERVICE = Object.freeze({
  name: 'NEO Guardian Control Plane',
  canonicalHost: 'neoguard.holytemples.org',
  schema: 'neo.guardian.control-plane.v2'
});

const MAX_BODY = 64 * 1024;
const ALLOWED_EVENT_SCHEMAS = new Set(['neo.hacker.endpoint-event.v1']);
const NONCE_RE = /^[A-Za-z0-9_-]{16,128}$/;

function json(res, status, body) {
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'});
  res.end(JSON.stringify(body));
}
async function body(req) {
  let size=0; const chunks=[];
  for await (const chunk of req) { size+=chunk.length; if(size>MAX_BODY) throw new Error('body_too_large'); chunks.push(chunk); }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}
function validEndpointId(v){return typeof v==='string'&&/^neo:endpoint:[A-Za-z0-9._:-]{1,180}$/.test(v);}
function validFingerprint(v){return typeof v==='string'&&/^[A-Fa-f0-9:]{32,128}$/.test(v);}
function rejectSecrets(o){
  const text=JSON.stringify(o).toLowerCase();
  const denied=['pairingcode','pairing_code','adb_private','privatekey','private_key','password','seedphrase','seed_phrase','recoverycode','recovery_code','devicepin','device_pin','biometric'];
  if(denied.some(k=>text.includes(`"${k}"`))) throw new Error('secret_material_refused');
}
function bearer(req){const h=req.headers.authorization||'';return h.startsWith('Bearer ')&&h.length>24?h.slice(7):null;}
function tokenHash(token){return crypto.createHash('sha256').update(token).digest('hex');}
function sameHash(a,b){if(!a||!b)return false;const x=Buffer.from(a);const y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);}

export function createMemoryRegistry(){
  const map=new Map();
  return {async put(id,r){map.set(id,{...r});},async get(id){return map.get(id)||null;},async update(id,p){const r=map.get(id);if(!r)return false;map.set(id,{...r,...p});return true;}};
}

export function createNeoGuardServer({enrollmentToken=process.env.NEOGUARD_ENROLLMENT_TOKEN||'',now=()=>new Date(),registry=createMemoryRegistry(),nonceTtlMs=5*60*1000,rateLimit=120}={}){
  const nonces=new Map(); const rates=new Map();
  function gateRequest(endpointId,payload){
    const t=now().getTime(); const nonce=payload.nonce; const sent=Date.parse(payload.sentAt||'');
    if(!NONCE_RE.test(String(nonce||''))||!Number.isFinite(sent)||Math.abs(t-sent)>nonceTtlMs) throw new Error('invalid_or_expired_nonce');
    const key=`${endpointId}:${nonce}`; if(nonces.has(key)) throw new Error('replay_refused'); nonces.set(key,t);
    for(const [k,v] of nonces) if(t-v>nonceTtlMs) nonces.delete(k);
    const minute=Math.floor(t/60000); const rk=`${endpointId}:${minute}`; const count=(rates.get(rk)||0)+1; rates.set(rk,count); if(count>rateLimit) throw new Error('rate_limited');
  }
  return http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'https://neoguard.holytemples.org');
      if(req.method==='GET'&&url.pathname==='/healthz')return json(res,200,{ok:true,service:SERVICE.name,schema:SERVICE.schema,storage:registry===undefined?'unknown':'configured'});
      if(req.method!=='POST')return json(res,404,{error:'not_found'});
      const payload=await body(req); rejectSecrets(payload);
      if(url.pathname==='/v1/enroll'){
        const token=bearer(req); if(!enrollmentToken||!token||!sameHash(tokenHash(token),tokenHash(enrollmentToken)))return json(res,401,{error:'unauthorized'});
        if(!validEndpointId(payload.endpointId)||!validFingerprint(payload.hostPublicKeyFingerprint))return json(res,400,{error:'invalid_enrollment'});
        const deviceToken=crypto.randomBytes(32).toString('base64url');
        await registry.put(payload.endpointId,{tokenHash:tokenHash(deviceToken),fingerprint:payload.hostPublicKeyFingerprint,enrolledAt:now().toISOString(),lastSeen:null,credentialVersion:1});
        return json(res,201,{schema:'neo.guardian.enrollment.v2',endpointId:payload.endpointId,deviceToken,credentialVersion:1,pairingCodeStored:false,adbPrivateKeyStored:false});
      }
      if(!validEndpointId(payload.endpointId))return json(res,400,{error:'invalid_endpoint_id'});
      const record=await registry.get(payload.endpointId); const token=bearer(req);
      if(!record||!token||!sameHash(tokenHash(token),record.tokenHash))return json(res,401,{error:'unauthorized'});
      gateRequest(payload.endpointId,payload);
      const seen=now().toISOString(); await registry.update(payload.endpointId,{lastSeen:seen});
      if(url.pathname==='/v1/heartbeat')return json(res,200,{ok:true,endpointId:payload.endpointId,receivedAt:seen});
      if(url.pathname==='/v1/posture')return json(res,202,{accepted:true,endpointId:payload.endpointId,classification:'OBSERVATION_NOT_PROOF_OF_COMPROMISE'});
      if(url.pathname==='/v1/events'){
        if(!payload.event||!ALLOWED_EVENT_SCHEMAS.has(payload.event.schema))return json(res,400,{error:'invalid_event_schema'});
        return json(res,202,{accepted:true,endpointId:payload.endpointId,toolAuthority:'NONE',consequentialAction:false});
      }
      return json(res,404,{error:'not_found'});
    }catch(e){
      const status=e.message==='body_too_large'?413:e.message==='rate_limited'?429:400;
      const safe=new Set(['secret_material_refused','invalid_or_expired_nonce','replay_refused','rate_limited']);
      return json(res,status,{error:safe.has(e.message)?e.message:'bad_request'});
    }
  });
}

if(process.argv[1]&&import.meta.url===new URL(`file://${process.argv[1]}`).href){const port=Number(process.env.PORT||8080);createNeoGuardServer().listen(port,'0.0.0.0',()=>console.log(`${SERVICE.name} listening on ${port}`));}
