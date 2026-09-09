import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const DEFAULT_SESSION_TTL_MS=8*60*60*1000;
function digest(value){return createHash('sha256').update(String(value)).digest();}
function hex(value){return digest(value).toString('hex');}
function safeMatch(value,expectedHex){
  if(!value||!expectedHex)return false;
  const expected=Buffer.from(expectedHex,'hex');
  const actual=digest(value);
  return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
function parseJson(value,fallback=[]){try{return JSON.parse(value||'[]');}catch{return fallback;}}
function clean(value){return String(value||'').replace(/[^A-Za-z0-9._-]/g,'_');}
function stateId(merchantId,entity){return `${clean(merchantId)}__${clean(entity)}`;}
function sessionId(token){return hex(token);}

export class FirestoreVersionConflictError extends Error{
  constructor(remote){super('version_conflict');this.code='VERSION_CONFLICT';this.remote=remote;}
}

export function createFirestoreContext({
  db,
  terminals=parseJson(process.env.NEO_COUNTER_TERMINALS_JSON),
  staff=parseJson(process.env.NEO_COUNTER_STAFF_JSON),
  adminHash=process.env.NEO_COUNTER_API_KEY_HASH||'',
  sessionTtlMs=Number(process.env.NEO_COUNTER_SESSION_TTL_MS||DEFAULT_SESSION_TTL_MS),
  now=()=>new Date(),
  randomToken=()=>randomBytes(32).toString('base64url'),
  randomId=()=>randomUUID()
}={}){
  if(!db?.collection||typeof db.runTransaction!=='function')throw new Error('firestore_db_required');
  const states=db.collection('neo_counter_state');
  const events=db.collection('neo_counter_events');
  const sessions=db.collection('neo_counter_sessions');

  async function init(){return true;}
  async function getState(merchantId,entity='merchant_ops'){
    const snap=await states.doc(stateId(merchantId,entity)).get();
    return snap?.exists?snap.data():null;
  }
  async function putEnvelope(envelope){
    const stateRef=states.doc(stateId(envelope.merchantId,envelope.entity));
    const eventId=randomId();
    const eventRef=events.doc(eventId);
    return db.runTransaction(async transaction=>{
      const currentSnap=await transaction.get(stateRef);
      const current=currentSnap?.exists?currentSnap.data():null;
      const currentVersion=Number(current?.version||0);
      if(currentVersion!==Number(envelope.version))throw new FirestoreVersionConflictError(current);
      const updatedAt=now().toISOString();
      const next={...envelope,version:currentVersion+1,updatedAt};
      const event={id:eventId,merchantId:next.merchantId,entity:next.entity,terminalId:next.terminalId,version:next.version,type:`${next.entity}.synced`,payload:next.payload,createdAt:updatedAt};
      transaction.set(stateRef,next,{merge:false});
      transaction.set(eventRef,event,{merge:false});
      return next;
    });
  }
  async function appendEvent({merchantId,entity='transaction',terminalId='unknown',version=0,type,payload,id=randomId(),createdAt=now().toISOString()}){
    const ref=events.doc(id);
    return db.runTransaction(async transaction=>{
      const existing=await transaction.get(ref);
      if(existing?.exists)return existing.data();
      const event={id,merchantId,entity,terminalId,version,type,payload:payload??{},createdAt};
      transaction.set(ref,event,{merge:false});
      return event;
    });
  }
  async function listEvents(merchantId,limit=100){
    const safeLimit=Math.max(1,Math.min(Number(limit)||100,500));
    const snap=await events.where('merchantId','==',merchantId).orderBy('createdAt','desc').limit(safeLimit).get();
    return (snap?.docs||[]).map(doc=>doc.data());
  }
  async function createSession({merchantId,terminalId,terminalSecret,staffId,pin}){
    const terminal=terminals.find(x=>x.id===terminalId&&x.merchantId===merchantId&&x.enabled!==false);
    const person=staff.find(x=>x.id===staffId&&x.merchantId===merchantId&&x.active!==false);
    if(!terminal||!person||!safeMatch(terminalSecret,terminal.secretHash)||!safeMatch(pin,person.pinHash))return null;
    const token=randomToken();
    const expiresAt=new Date(now().getTime()+sessionTtlMs).toISOString();
    const value={merchantId,terminalId,staffId,permissions:person.permissions||[],expiresAt};
    await sessions.doc(sessionId(token)).set(value,{merge:false});
    return {token,...value};
  }
  function adminPrincipal(req){
    if(!adminHash)return null;
    const auth=req.headers?.authorization||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!safeMatch(token,adminHash))return null;
    return {kind:'admin',merchantId:'*',terminalId:'admin',staffId:'admin',permissions:['*']};
  }
  async function sessionPrincipal(req){
    const admin=adminPrincipal(req);if(admin)return admin;
    const auth=req.headers?.authorization||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return null;
    const ref=sessions.doc(sessionId(token));
    const snap=await ref.get();
    if(!snap?.exists)return null;
    const value=snap.data();
    if(!value?.expiresAt||Date.parse(value.expiresAt)<=now().getTime()){await ref.delete();return null;}
    return {...value,kind:'session'};
  }
  async function revoke(req){
    const auth=req.headers?.authorization||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return false;
    const ref=sessions.doc(sessionId(token));
    const snap=await ref.get();
    if(!snap?.exists)return false;
    await ref.delete();return true;
  }
  function can(principal,permission,merchantId){
    if(!principal)return false;
    if(principal.permissions.includes('*'))return true;
    return principal.merchantId===merchantId&&principal.permissions.includes(permission);
  }
  return {init,getState,putEnvelope,appendEvent,listEvents,createSession,sessionPrincipal,revoke,can};
}
