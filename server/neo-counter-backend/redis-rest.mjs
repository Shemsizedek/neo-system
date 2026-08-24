import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS=Number(process.env.NEO_COUNTER_SESSION_TTL_MS||8*60*60*1000);
const REDIS_URL=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||'';
const REDIS_TOKEN=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||'';

function digest(value){return createHash('sha256').update(String(value)).digest();}
function hex(value){return digest(value).toString('hex');}
function safeMatch(value,expectedHex){
  if(!value||!expectedHex)return false;
  const expected=Buffer.from(expectedHex,'hex');
  const actual=digest(value);
  return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
function parseJsonEnv(name){try{return JSON.parse(process.env[name]||'[]');}catch{return [];}}
function stateKey(merchantId,entity){return `neo-counter:state:${merchantId}:${entity}`;}
function eventsKey(merchantId){return `neo-counter:events:${merchantId}`;}
function sessionKey(tokenHash){return `neo-counter:session:${tokenHash}`;}

async function redis(command){
  if(!REDIS_URL||!REDIS_TOKEN)throw new Error('Upstash Redis REST credentials are not configured.');
  const res=await fetch(REDIS_URL,{method:'POST',headers:{authorization:`Bearer ${REDIS_TOKEN}`,'content-type':'application/json'},body:JSON.stringify(command)});
  if(!res.ok)throw new Error(`Redis REST request failed (${res.status})`);
  const body=await res.json();
  if(body.error)throw new Error(body.error);
  return body.result;
}

export class RedisVersionConflictError extends Error{
  constructor(remote){super('version_conflict');this.code='VERSION_CONFLICT';this.remote=remote;}
}

export function createRedisContext(){
  const terminals=parseJsonEnv('NEO_COUNTER_TERMINALS_JSON');
  const staff=parseJsonEnv('NEO_COUNTER_STAFF_JSON');
  const adminHash=process.env.NEO_COUNTER_API_KEY_HASH||'';

  async function init(){return true;}
  async function getState(merchantId,entity='merchant_ops'){
    const raw=await redis(['GET',stateKey(merchantId,entity)]);
    return raw?JSON.parse(raw):null;
  }
  async function putEnvelope(envelope){
    const next={...envelope,version:Number(envelope.version)+1,updatedAt:new Date().toISOString()};
    const event={id:randomUUID(),merchantId:next.merchantId,entity:next.entity,terminalId:next.terminalId,version:next.version,type:`${next.entity}.synced`,payload:next.payload,createdAt:next.updatedAt};
    const script=`local current=redis.call('GET',KEYS[1]);local cv=0;if current then local obj=cjson.decode(current);cv=tonumber(obj.version) or 0 end;if cv~=tonumber(ARGV[1]) then return {0,current or ''} end;redis.call('SET',KEYS[1],ARGV[2]);redis.call('ZADD',KEYS[2],ARGV[3],ARGV[4]);return {1,ARGV[2]}`;
    const result=await redis(['EVAL',script,'2',stateKey(next.merchantId,next.entity),eventsKey(next.merchantId),String(envelope.version),JSON.stringify(next),String(Date.parse(event.createdAt)),JSON.stringify(event)]);
    const ok=Number(result?.[0]||0)===1;
    if(!ok){const remoteRaw=result?.[1];throw new RedisVersionConflictError(remoteRaw?JSON.parse(remoteRaw):null);}
    return next;
  }
  async function appendEvent({merchantId,entity='transaction',terminalId='unknown',version=0,type,payload,id=randomUUID(),createdAt=new Date().toISOString()}){
    const event={id,merchantId,entity,terminalId,version,type,payload:payload??{},createdAt};
    await redis(['ZADD',eventsKey(merchantId),String(Date.parse(createdAt)),JSON.stringify(event)]);
    return event;
  }
  async function listEvents(merchantId,limit=100){
    const safeLimit=Math.max(1,Math.min(Number(limit)||100,500));
    const rows=await redis(['ZREVRANGE',eventsKey(merchantId),'0',String(safeLimit-1)]);
    return Array.isArray(rows)?rows.map(x=>JSON.parse(x)):[];
  }
  async function createSession({merchantId,terminalId,terminalSecret,staffId,pin}){
    const terminal=terminals.find(x=>x.id===terminalId&&x.merchantId===merchantId&&x.enabled!==false);
    const person=staff.find(x=>x.id===staffId&&x.merchantId===merchantId&&x.active!==false);
    if(!terminal||!person||!safeMatch(terminalSecret,terminal.secretHash)||!safeMatch(pin,person.pinHash))return null;
    const token=randomBytes(32).toString('base64url');
    const expiresAt=new Date(Date.now()+SESSION_TTL_MS).toISOString();
    const value={merchantId,terminalId,staffId,permissions:person.permissions||[],expiresAt};
    await redis(['SET',sessionKey(hex(token)),JSON.stringify(value),'PX',String(SESSION_TTL_MS)]);
    return {token,...value};
  }
  function adminPrincipal(req){
    if(!adminHash)return null;
    const auth=req.headers.authorization||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!safeMatch(token,adminHash))return null;
    return {kind:'admin',merchantId:'*',terminalId:'admin',staffId:'admin',permissions:['*']};
  }
  async function sessionPrincipal(req){
    const admin=adminPrincipal(req);if(admin)return admin;
    const auth=req.headers.authorization||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return null;
    const raw=await redis(['GET',sessionKey(hex(token))]);
    if(!raw)return null;
    const value=JSON.parse(raw);
    return {...value,kind:'session'};
  }
  async function revoke(req){
    const auth=req.headers.authorization||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return false;
    return Number(await redis(['DEL',sessionKey(hex(token))]))>0;
  }
  function can(principal,permission,merchantId){
    if(!principal)return false;
    if(principal.permissions.includes('*'))return true;
    return principal.merchantId===merchantId&&principal.permissions.includes(permission);
  }
  return {init,getState,putEnvelope,appendEvent,listEvents,createSession,sessionPrincipal,revoke,can};
}
