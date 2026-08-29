import {DatabaseSync} from 'node:sqlite'
import {mkdirSync} from 'node:fs'
import {dirname} from 'node:path'
import crypto from 'node:crypto'

const now=()=>new Date().toISOString()
const parse=row=>row?JSON.parse(row.payload):null

export class PersistentStateStore{
  constructor(path=process.env.NEO_MINER_DB_PATH||'./data/neo-miner.sqlite'){
    mkdirSync(dirname(path),{recursive:true})
    this.path=path
    this.db=new DatabaseSync(path)
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS state_entities(kind TEXT NOT NULL,id TEXT NOT NULL,payload TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(kind,id));
      CREATE TABLE IF NOT EXISTS audit_events(seq INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT NOT NULL UNIQUE,kind TEXT NOT NULL,entity_id TEXT,action TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS idempotency_keys(scope TEXT NOT NULL,key TEXT NOT NULL,result TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(scope,key));`)
    this.putStmt=this.db.prepare('INSERT INTO state_entities(kind,id,payload,updated_at) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at')
    this.getStmt=this.db.prepare('SELECT payload FROM state_entities WHERE kind=? AND id=?')
    this.listStmt=this.db.prepare('SELECT payload FROM state_entities WHERE kind=? ORDER BY updated_at,id')
    this.auditStmt=this.db.prepare('INSERT INTO audit_events(event_id,kind,entity_id,action,payload,created_at) VALUES(?,?,?,?,?,?)')
    this.idemGet=this.db.prepare('SELECT result FROM idempotency_keys WHERE scope=? AND key=?')
    this.idemPut=this.db.prepare('INSERT INTO idempotency_keys(scope,key,result,created_at) VALUES(?,?,?,?)')
  }
  put(kind,id,value,{action='UPSERT',audit=true}={}){
    if(!kind||!id) throw new Error('STORE_KIND_AND_ID_REQUIRED')
    const at=now(), payload=JSON.stringify(value)
    this.db.exec('BEGIN IMMEDIATE')
    try{
      this.putStmt.run(kind,String(id),payload,at)
      if(audit)this.auditStmt.run(`AUD-${crypto.randomUUID()}`,kind,String(id),action,payload,at)
      this.db.exec('COMMIT')
      return value
    }catch(error){this.db.exec('ROLLBACK');throw error}
  }
  get(kind,id){return parse(this.getStmt.get(kind,String(id)))}
  list(kind){return this.listStmt.all(kind).map(parse)}
  appendAudit(kind,entityId,action,payload={}){
    const event={eventId:`AUD-${crypto.randomUUID()}`,kind,entityId:entityId?String(entityId):null,action,payload,createdAt:now()}
    this.auditStmt.run(event.eventId,event.kind,event.entityId,event.action,JSON.stringify(payload),event.createdAt)
    return event
  }
  audit(limit=200){return this.db.prepare('SELECT seq,event_id AS eventId,kind,entity_id AS entityId,action,payload,created_at AS createdAt FROM audit_events ORDER BY seq DESC LIMIT ?').all(Math.max(1,Math.min(1000,Number(limit)||200))).map(r=>({...r,payload:JSON.parse(r.payload)}))}
  idempotent(scope,key,work){
    if(!key) throw new Error('IDEMPOTENCY_KEY_REQUIRED')
    const cached=this.idemGet.get(scope,String(key));if(cached)return {replayed:true,value:JSON.parse(cached.result)}
    this.db.exec('BEGIN IMMEDIATE')
    try{
      const again=this.idemGet.get(scope,String(key));if(again){this.db.exec('COMMIT');return {replayed:true,value:JSON.parse(again.result)}}
      const value=work();this.idemPut.run(scope,String(key),JSON.stringify(value),now());this.db.exec('COMMIT');return {replayed:false,value}
    }catch(error){this.db.exec('ROLLBACK');throw error}
  }
  close(){this.db.close()}
}

export const hydrateMap=(store,kind)=>new Map(store.list(kind).map(v=>[String(v.id||v.shareId||v.payoutId||v.receiptId||v.intentId||v.psbtId),v]))
