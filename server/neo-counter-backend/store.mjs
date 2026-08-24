import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

export class VersionConflictError extends Error {
  constructor(remote){ super('version_conflict'); this.code='VERSION_CONFLICT'; this.remote=remote; }
}

export function createStore(path='data/neo-counter.sqlite'){
  const db=new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS sync_state(
      merchant_id TEXT NOT NULL,
      entity TEXT NOT NULL,
      envelope_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      terminal_id TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      PRIMARY KEY(merchant_id, entity)
    );
    CREATE TABLE IF NOT EXISTS event_ledger(
      id TEXT PRIMARY KEY,
      merchant_id TEXT NOT NULL,
      entity TEXT NOT NULL,
      terminal_id TEXT NOT NULL,
      version INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_event_merchant_created ON event_ledger(merchant_id, created_at DESC);
  `);

  const getState=(merchantId,entity='merchant_ops')=>{
    const row=db.prepare('SELECT * FROM sync_state WHERE merchant_id=? AND entity=?').get(merchantId,entity);
    if(!row) return null;
    return {id:row.envelope_id,entity:row.entity,merchantId:row.merchant_id,terminalId:row.terminal_id,version:row.version,updatedAt:row.updated_at,payload:JSON.parse(row.payload_json)};
  };

  const putEnvelope=(envelope)=>{
    const current=getState(envelope.merchantId,envelope.entity);
    const currentVersion=current?.version||0;
    if(Number(envelope.version)!==currentVersion) throw new VersionConflictError(current);
    const next={...envelope,version:currentVersion+1,updatedAt:new Date().toISOString()};
    db.exec('BEGIN IMMEDIATE');
    try{
      db.prepare(`INSERT INTO sync_state(merchant_id,entity,envelope_id,version,terminal_id,updated_at,payload_json)
        VALUES(?,?,?,?,?,?,?) ON CONFLICT(merchant_id,entity) DO UPDATE SET envelope_id=excluded.envelope_id,version=excluded.version,terminal_id=excluded.terminal_id,updated_at=excluded.updated_at,payload_json=excluded.payload_json`)
        .run(next.merchantId,next.entity,next.id,next.version,next.terminalId,next.updatedAt,JSON.stringify(next.payload));
      db.prepare('INSERT INTO event_ledger(id,merchant_id,entity,terminal_id,version,event_type,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)')
        .run(randomUUID(),next.merchantId,next.entity,next.terminalId,next.version,`${next.entity}.synced`,JSON.stringify(next.payload),next.updatedAt);
      db.exec('COMMIT');
      return next;
    }catch(error){db.exec('ROLLBACK');throw error;}
  };

  const appendEvent=({merchantId,entity='transaction',terminalId='unknown',version=0,type,payload,id=randomUUID(),createdAt=new Date().toISOString()})=>{
    db.prepare('INSERT INTO event_ledger(id,merchant_id,entity,terminal_id,version,event_type,payload_json,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(id,merchantId,entity,terminalId,version,type,JSON.stringify(payload??{}),createdAt);
    return {id,merchantId,entity,terminalId,version,type,payload:payload??{},createdAt};
  };

  const listEvents=(merchantId,limit=100)=>db.prepare('SELECT * FROM event_ledger WHERE merchant_id=? ORDER BY created_at DESC LIMIT ?').all(merchantId,Math.min(limit,500)).map(row=>({id:row.id,merchantId:row.merchant_id,entity:row.entity,terminalId:row.terminal_id,version:row.version,type:row.event_type,payload:JSON.parse(row.payload_json),createdAt:row.created_at}));

  return {db,getState,putEnvelope,appendEvent,listEvents,close:()=>db.close()};
}
