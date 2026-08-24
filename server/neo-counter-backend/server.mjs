import http from 'node:http';
import { createHash, timingSafeEqual, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const PORT=Number(process.env.NEO_COUNTER_PORT||8787);
const DB_PATH=process.env.NEO_COUNTER_DB_PATH||'data/neo-counter.sqlite';
const API_KEY_HASH=process.env.NEO_COUNTER_API_KEY_HASH||'';
const ALLOWED_ORIGIN=process.env.NEO_COUNTER_ALLOWED_ORIGIN||'https://shemsizedek.github.io';

export function createStore(path=DB_PATH){
  const db=new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode=WAL;
    CREATE TABLE IF NOT EXISTS merchant_state(
      merchant_id TEXT PRIMARY KEY,
      version INTEGER NOT NULL,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS event_ledger(
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      terminal_id TEXT,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_event_merchant_created ON event_ledger(merchant_id, created_at DESC);
  `);
  return db;
}

function hashKey(value){return createHash('sha256').update(value).digest();}
function authorized(req){
  if(!API_KEY_HASH) return true;
  const auth=req.headers.authorization||'';
  const token=auth.startsWith('Bearer ')?auth.slice(7):'';
  if(!token) return false;
  const expected=Buffer.from(API_KEY_HASH,'hex');
  const actual=hashKey(token);
  return expected.length===actual.length && timingSafeEqual(expected,actual);
}
function cors(res){
  res.setHeader('Access-Control-Allow-Origin',ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Headers','Authorization, Content-Type, If-Match');
  res.setHeader('Access-Control-Allow-Methods','GET,PUT,POST,OPTIONS');
}
function send(res,status,body){cors(res);res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(body));}
async function readJson(req){
  const chunks=[];for await(const chunk of req) chunks.push(chunk);
  if(!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function stateRow(db,merchantId){return db.prepare('SELECT merchant_id,version,state_json,updated_at FROM merchant_state WHERE merchant_id=?').get(merchantId);}

export function createHandler(db){
  return async function handler(req,res){
    try{
      if(req.method==='OPTIONS'){cors(res);res.writeHead(204);return res.end();}
      if(!authorized(req)) return send(res,401,{error:'unauthorized'});
      const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
      if(url.pathname==='/health') return send(res,200,{ok:true,service:'neo-counter-backend'});
      const stateMatch=url.pathname.match(/^\/v1\/merchants\/([^/]+)\/state$/);
      if(stateMatch){
        const merchantId=decodeURIComponent(stateMatch[1]);
        if(req.method==='GET'){
          const row=stateRow(db,merchantId);
          if(!row) return send(res,404,{error:'not_found'});
          return send(res,200,{merchantId,version:row.version,state:JSON.parse(row.state_json),updatedAt:row.updated_at});
        }
        if(req.method==='PUT'){
          const body=await readJson(req);
          const current=stateRow(db,merchantId);
          const expectedVersion=Number((req.headers['if-match']||'0').toString().replace(/\D/g,''));
          const currentVersion=current?.version||0;
          if(expectedVersion!==currentVersion) return send(res,409,{error:'version_conflict',currentVersion});
          const nextVersion=currentVersion+1;
          const now=new Date().toISOString();
          db.prepare(`INSERT INTO merchant_state(merchant_id,version,state_json,updated_at) VALUES(?,?,?,?)
            ON CONFLICT(merchant_id) DO UPDATE SET version=excluded.version,state_json=excluded.state_json,updated_at=excluded.updated_at`)
            .run(merchantId,nextVersion,JSON.stringify(body.state??body),now);
          db.prepare('INSERT INTO event_ledger(id,merchant_id,terminal_id,event_type,payload_json,created_at) VALUES(?,?,?,?,?,?)')
            .run(randomUUID(),merchantId,body.terminalId||null,'merchant_state.updated',JSON.stringify({version:nextVersion}),now);
          return send(res,200,{merchantId,version:nextVersion,state:body.state??body,updatedAt:now});
        }
      }
      const eventMatch=url.pathname.match(/^\/v1\/merchants\/([^/]+)\/events$/);
      if(eventMatch){
        const merchantId=decodeURIComponent(eventMatch[1]);
        if(req.method==='POST'){
          const body=await readJson(req); const now=new Date().toISOString(); const id=body.id||randomUUID();
          db.prepare('INSERT INTO event_ledger(id,merchant_id,terminal_id,event_type,payload_json,created_at) VALUES(?,?,?,?,?,?)')
            .run(id,merchantId,body.terminalId||null,body.type||'unknown',JSON.stringify(body.payload??{}),now);
          return send(res,201,{id,createdAt:now});
        }
        if(req.method==='GET'){
          const limit=Math.min(Number(url.searchParams.get('limit')||100),500);
          const rows=db.prepare('SELECT id,terminal_id,event_type,payload_json,created_at FROM event_ledger WHERE merchant_id=? ORDER BY created_at DESC LIMIT ?').all(merchantId,limit);
          return send(res,200,{events:rows.map(r=>({id:r.id,terminalId:r.terminal_id,type:r.event_type,payload:JSON.parse(r.payload_json),createdAt:r.created_at}))});
        }
      }
      return send(res,404,{error:'not_found'});
    }catch(error){return send(res,500,{error:'internal_error',message:error instanceof Error?error.message:'unknown'});}
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const db=createStore();
  http.createServer(createHandler(db)).listen(PORT,()=>console.log(`NEO Counter backend listening on :${PORT}`));
}
