import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_MS=Number(process.env.NEO_COUNTER_SESSION_TTL_MS||8*60*60*1000);

function digest(value){return createHash('sha256').update(String(value)).digest();}
function hex(value){return digest(value).toString('hex');}
function safeMatch(value,expectedHex){
  if(!value||!expectedHex) return false;
  const expected=Buffer.from(expectedHex,'hex');
  const actual=digest(value);
  return expected.length===actual.length && timingSafeEqual(expected,actual);
}
function parseJsonEnv(name){
  try{return JSON.parse(process.env[name]||'[]');}catch{return [];}
}

export function createAuth(db){
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_sessions(
      token_hash TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      permissions_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_auth_sessions_expiry ON auth_sessions(expires_at);
  `);

  const terminals=parseJsonEnv('NEO_COUNTER_TERMINALS_JSON');
  const staff=parseJsonEnv('NEO_COUNTER_STAFF_JSON');
  const adminHash=process.env.NEO_COUNTER_API_KEY_HASH||'';

  function adminPrincipal(req){
    if(!adminHash) return null;
    const auth=req.headers.authorization||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!safeMatch(token,adminHash)) return null;
    return {kind:'admin',merchantId:'*',terminalId:'admin',staffId:'admin',permissions:['*']};
  }

  function createSession({merchantId,terminalId,terminalSecret,staffId,pin}){
    const terminal=terminals.find(x=>x.id===terminalId&&x.merchantId===merchantId&&x.enabled!==false);
    const person=staff.find(x=>x.id===staffId&&x.merchantId===merchantId&&x.active!==false);
    if(!terminal||!person) return null;
    if(!safeMatch(terminalSecret,terminal.secretHash)||!safeMatch(pin,person.pinHash)) return null;
    const token=randomBytes(32).toString('base64url');
    const tokenHash=hex(token);
    const createdAt=new Date();
    const expiresAt=new Date(createdAt.getTime()+SESSION_TTL_MS);
    db.prepare('INSERT INTO auth_sessions(token_hash,merchant_id,terminal_id,staff_id,permissions_json,created_at,expires_at) VALUES(?,?,?,?,?,?,?)')
      .run(tokenHash,merchantId,terminalId,staffId,JSON.stringify(person.permissions||[]),createdAt.toISOString(),expiresAt.toISOString());
    return {token,merchantId,terminalId,staffId,permissions:person.permissions||[],expiresAt:expiresAt.toISOString()};
  }

  function sessionPrincipal(req){
    const admin=adminPrincipal(req); if(admin) return admin;
    const auth=req.headers.authorization||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token) return null;
    const row=db.prepare('SELECT * FROM auth_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>?').get(hex(token),new Date().toISOString());
    if(!row) return null;
    return {kind:'session',merchantId:row.merchant_id,terminalId:row.terminal_id,staffId:row.staff_id,permissions:JSON.parse(row.permissions_json),expiresAt:row.expires_at};
  }

  function revoke(req){
    const auth=req.headers.authorization||'';
    const token=auth.startsWith('Bearer ')?auth.slice(7):'';
    if(!token) return false;
    const result=db.prepare('UPDATE auth_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL').run(new Date().toISOString(),hex(token));
    return Number(result.changes)>0;
  }

  function can(principal,permission,merchantId){
    if(!principal) return false;
    if(principal.permissions.includes('*')) return true;
    if(principal.merchantId!==merchantId) return false;
    return principal.permissions.includes(permission);
  }

  return {createSession,sessionPrincipal,revoke,can};
}
