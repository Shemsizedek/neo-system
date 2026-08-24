import { neon } from '@neondatabase/serverless';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS=Number(process.env.NEO_COUNTER_SESSION_TTL_MS||8*60*60*1000);

function digest(value){return createHash('sha256').update(String(value)).digest();}
function hex(value){return digest(value).toString('hex');}
function safeMatch(value,expectedHex){
  if(!value||!expectedHex) return false;
  const expected=Buffer.from(expectedHex,'hex');
  const actual=digest(value);
  return expected.length===actual.length&&timingSafeEqual(expected,actual);
}
function parseJsonEnv(name){try{return JSON.parse(process.env[name]||'[]');}catch{return [];}}

export class PgVersionConflictError extends Error{
  constructor(remote){super('version_conflict');this.code='VERSION_CONFLICT';this.remote=remote;}
}

export function createPostgresContext(connectionString=process.env.DATABASE_URL){
  if(!connectionString) throw new Error('DATABASE_URL is required for the production NEO Counter backend.');
  const sql=neon(connectionString);
  const terminals=parseJsonEnv('NEO_COUNTER_TERMINALS_JSON');
  const staff=parseJsonEnv('NEO_COUNTER_STAFF_JSON');
  const adminHash=process.env.NEO_COUNTER_API_KEY_HASH||'';

  async function init(){
    await sql`CREATE TABLE IF NOT EXISTS neo_counter_sync_state(
      merchant_id TEXT NOT NULL,
      entity TEXT NOT NULL,
      envelope_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      terminal_id TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL,
      payload_json JSONB NOT NULL,
      PRIMARY KEY(merchant_id,entity)
    )`;
    await sql`CREATE TABLE IF NOT EXISTS neo_counter_event_ledger(
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      entity TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_neo_counter_events_merchant_created ON neo_counter_event_ledger(merchant_id,created_at DESC)`;
    await sql`CREATE TABLE IF NOT EXISTS neo_counter_auth_sessions(
      token_hash TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      permissions_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked_at TIMESTAMPTZ
    )`;
    await sql`CREATE INDEX IF NOT EXISTS idx_neo_counter_sessions_expiry ON neo_counter_auth_sessions(expires_at)`;
  }

  async function getState(merchantId,entity='merchant_ops'){
    const rows=await sql`SELECT merchant_id,entity,envelope_id,version,terminal_id,updated_at,payload_json FROM neo_counter_sync_state WHERE merchant_id=${merchantId} AND entity=${entity}`;
    const row=rows[0];
    if(!row) return null;
    return {id:row.envelope_id,entity:row.entity,merchantId:row.merchant_id,terminalId:row.terminal_id,version:Number(row.version),updatedAt:new Date(row.updated_at).toISOString(),payload:row.payload_json};
  }

  async function putEnvelope(envelope){
    const current=await getState(envelope.merchantId,envelope.entity);
    const currentVersion=current?.version||0;
    if(Number(envelope.version)!==currentVersion) throw new PgVersionConflictError(current);
    const next={...envelope,version:currentVersion+1,updatedAt:new Date().toISOString()};
    const rows=await sql`
      INSERT INTO neo_counter_sync_state(merchant_id,entity,envelope_id,version,terminal_id,updated_at,payload_json)
      VALUES(${next.merchantId},${next.entity},${next.id},${next.version},${next.terminalId},${next.updatedAt},${JSON.stringify(next.payload)}::jsonb)
      ON CONFLICT(merchant_id,entity) DO UPDATE SET
        envelope_id=EXCLUDED.envelope_id,
        version=EXCLUDED.version,
        terminal_id=EXCLUDED.terminal_id,
        updated_at=EXCLUDED.updated_at,
        payload_json=EXCLUDED.payload_json
      WHERE neo_counter_sync_state.version=${currentVersion}
      RETURNING version`;
    if(!rows.length) throw new PgVersionConflictError(await getState(envelope.merchantId,envelope.entity));
    await appendEvent({merchantId:next.merchantId,entity:next.entity,terminalId:next.terminalId,version:next.version,type:`${next.entity}.synced`,payload:next.payload,createdAt:next.updatedAt});
    return next;
  }

  async function appendEvent({merchantId,entity='transaction',terminalId='unknown',version=0,type,payload,id=randomUUID(),createdAt=new Date().toISOString()}){
    await sql`INSERT INTO neo_counter_event_ledger(id,merchant_id,entity,terminal_id,version,event_type,payload_json,created_at)
      VALUES(${id},${merchantId},${entity},${terminalId},${version},${type},${JSON.stringify(payload??{})}::jsonb,${createdAt})`;
    return {id,merchantId,entity,terminalId,version,type,payload:payload??{},createdAt};
  }

  async function listEvents(merchantId,limit=100){
    const safeLimit=Math.max(1,Math.min(Number(limit)||100,500));
    const rows=await sql`SELECT id,merchant_id,entity,terminal_id,version,event_type,payload_json,created_at FROM neo_counter_event_ledger WHERE merchant_id=${merchantId} ORDER BY created_at DESC LIMIT ${safeLimit}`;
    return rows.map(row=>({id:row.id,merchantId:row.merchant_id,entity:row.entity,terminalId:row.terminal_id,version:Number(row.version),type:row.event_type,payload:row.payload_json,createdAt:new Date(row.created_at).toISOString()}));
  }

  async function createSession({merchantId,terminalId,terminalSecret,staffId,pin}){
    const terminal=terminals.find(x=>x.id===terminalId&&x.merchantId===merchantId&&x.enabled!==false);
    const person=staff.find(x=>x.id===staffId&&x.merchantId===merchantId&&x.active!==false);
    if(!terminal||!person||!safeMatch(terminalSecret,terminal.secretHash)||!safeMatch(pin,person.pinHash)) return null;
    const token=randomBytes(32).toString('base64url');
    const createdAt=new Date();
    const expiresAt=new Date(createdAt.getTime()+SESSION_TTL_MS);
    await sql`INSERT INTO neo_counter_auth_sessions(token_hash,merchant_id,terminal_id,staff_id,permissions_json,created_at,expires_at)
      VALUES(${hex(token)},${merchantId},${terminalId},${staffId},${JSON.stringify(person.permissions||[])}::jsonb,${createdAt.toISOString()},${expiresAt.toISOString()})`;
    return {token,merchantId,terminalId,staffId,permissions:person.permissions||[],expiresAt:expiresAt.toISOString()};
  }

  function adminPrincipal(req){
    if(!adminHash) return null;
    const auth=req.headers.authorization||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!safeMatch(token,adminHash)) return null;
    return {kind:'admin',merchantId:'*',terminalId:'admin',staffId:'admin',permissions:['*']};
  }

  async function sessionPrincipal(req){
    const admin=adminPrincipal(req);if(admin)return admin;
    const auth=req.headers.authorization||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return null;
    const rows=await sql`SELECT merchant_id,terminal_id,staff_id,permissions_json,expires_at FROM neo_counter_auth_sessions WHERE token_hash=${hex(token)} AND revoked_at IS NULL AND expires_at>NOW()`;
    const row=rows[0];
    return row?{kind:'session',merchantId:row.merchant_id,terminalId:row.terminal_id,staffId:row.staff_id,permissions:row.permissions_json,expiresAt:new Date(row.expires_at).toISOString()}:null;
  }

  async function revoke(req){
    const auth=req.headers.authorization||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token)return false;
    const rows=await sql`UPDATE neo_counter_auth_sessions SET revoked_at=NOW() WHERE token_hash=${hex(token)} AND revoked_at IS NULL RETURNING token_hash`;
    return rows.length>0;
  }

  function can(principal,permission,merchantId){
    if(!principal)return false;
    if(principal.permissions.includes('*'))return true;
    return principal.merchantId===merchantId&&principal.permissions.includes(permission);
  }

  return {init,getState,putEnvelope,appendEvent,listEvents,createSession,sessionPrincipal,revoke,can};
}
