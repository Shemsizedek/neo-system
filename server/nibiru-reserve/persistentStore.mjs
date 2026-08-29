import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import crypto from 'node:crypto';

const parse=row=>row?JSON.parse(row.payload):null;
export class NibiruPersistentStore{
  constructor(path=process.env.NIBIRU_RESERVE_DB_PATH||'./data/nibiru-reserve.sqlite'){
    mkdirSync(dirname(path),{recursive:true});this.path=path;this.db=new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS entities(kind TEXT NOT NULL,id TEXT NOT NULL,payload TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(kind,id));CREATE TABLE IF NOT EXISTS audit(seq INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT NOT NULL UNIQUE,kind TEXT NOT NULL,entity_id TEXT NOT NULL,action TEXT NOT NULL,payload TEXT NOT NULL,created_at TEXT NOT NULL);`);
    this.putStmt=this.db.prepare('INSERT INTO entities(kind,id,payload,updated_at) VALUES(?,?,?,?) ON CONFLICT(kind,id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at');
  }
  put(kind,value,action='UPSERT'){if(!value?.id)throw new Error('persistent entity id is required');const at=new Date().toISOString(),payload=JSON.stringify(value);this.db.exec('BEGIN IMMEDIATE');try{this.putStmt.run(kind,String(value.id),payload,at);this.db.prepare('INSERT INTO audit(event_id,kind,entity_id,action,payload,created_at) VALUES(?,?,?,?,?,?)').run(`AUD-${crypto.randomUUID()}`,kind,String(value.id),action,payload,at);this.db.exec('COMMIT');return value}catch(error){this.db.exec('ROLLBACK');throw error}}
  list(kind){return this.db.prepare('SELECT payload FROM entities WHERE kind=? ORDER BY updated_at,id').all(kind).map(parse)}
  audit(limit=200){return this.db.prepare('SELECT seq,event_id AS eventId,kind,entity_id AS entityId,action,payload,created_at AS createdAt FROM audit ORDER BY seq DESC LIMIT ?').all(Math.max(1,Math.min(1000,Number(limit)||200))).map(row=>({...row,payload:JSON.parse(row.payload)}))}
  close(){this.db.close()}
}

export function persistNibiru(nibiru,store){
  const bindings=[['reserve-position',nibiru.reserveEntries],['iso-message',nibiru.messages],['journal',nibiru.ledger.journals],['settlement',nibiru.reconciler.settlements],['recognition',nibiru.recognition.assessments],['attestation',nibiru.attestations.attestations]];
  for(const[kind,map]of bindings)for(const row of store.list(kind))map.set(String(row.id),row);
  const wrap=(target,name,kind)=>{const original=target[name].bind(target);target[name]=(...args)=>{const result=original(...args);if(result?.id)store.put(kind,result,name);return result}};
  wrap(nibiru,'recordCesPosition','reserve-position');wrap(nibiru,'linkBlockchainSettlement','reserve-position');wrap(nibiru,'createIsoPaymentEnvelope','iso-message');wrap(nibiru.ledger,'postJournal','journal');wrap(nibiru.reconciler,'observe','settlement');wrap(nibiru.reconciler,'reconcile','settlement');wrap(nibiru.recognition,'assess','recognition');wrap(nibiru.recognition,'approve','recognition');wrap(nibiru.attestations,'verify','attestation');
  const syncCes=nibiru.syncCes.bind(nibiru);nibiru.syncCes=async(...args)=>{const result=await syncCes(...args);if(result?.entry)store.put('reserve-position',result.entry,'syncCes');return result};
  return nibiru;
}
