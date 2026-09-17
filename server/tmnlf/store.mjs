import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

export function createTmnlfStore(path=process.env.TMNLF_DB_PATH||'data/tmnlf.sqlite'){
 const db=new DatabaseSync(path);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS tmnlf_matters(id TEXT PRIMARY KEY,name TEXT NOT NULL,objective TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'INTAKE',priority TEXT NOT NULL DEFAULT 'NORMAL',jurisdiction TEXT NOT NULL DEFAULT 'UNRESOLVED',next_action TEXT NOT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS tmnlf_events(id TEXT PRIMARY KEY,matter_id TEXT NOT NULL,event_type TEXT NOT NULL,actor TEXT NOT NULL,payload_json TEXT NOT NULL,created_at TEXT NOT NULL,FOREIGN KEY(matter_id) REFERENCES tmnlf_matters(id));
 CREATE INDEX IF NOT EXISTS idx_tmnlf_events_matter ON tmnlf_events(matter_id,created_at DESC);`);
 const appendEvent=(matterId,eventType,actor='system',payload={})=>{const e={id:randomUUID(),matterId,eventType,actor,payload,createdAt:new Date().toISOString()};db.prepare('INSERT INTO tmnlf_events(id,matter_id,event_type,actor,payload_json,created_at) VALUES(?,?,?,?,?,?)').run(e.id,e.matterId,e.eventType,e.actor,JSON.stringify(e.payload),e.createdAt);return e};
 const map=r=>r?{id:r.id,name:r.name,objective:r.objective,status:r.status,priority:r.priority,jurisdiction:r.jurisdiction,nextAction:r.next_action,createdAt:r.created_at,updatedAt:r.updated_at}:null;
 const list=()=>db.prepare('SELECT * FROM tmnlf_matters ORDER BY created_at ASC').all().map(map);
 const get=id=>map(db.prepare('SELECT * FROM tmnlf_matters WHERE id=?').get(id));
 const create=(input,actor='system')=>{if(!input?.name||!input?.objective)throw new Error('name_and_objective_required');const row=db.prepare("SELECT id FROM tmnlf_matters WHERE id LIKE 'TMNLF-%' ORDER BY CAST(substr(id,7) AS INTEGER) DESC LIMIT 1").get();const n=(Number(row?.id?.split('-')[1])||0)+1,id=`TMNLF-${String(n).padStart(3,'0')}`,now=new Date().toISOString();db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO tmnlf_matters(id,name,objective,status,priority,jurisdiction,next_action,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').run(id,String(input.name).trim(),String(input.objective).trim(),'INTAKE','NORMAL','UNRESOLVED','Resolve jurisdiction before material legal conclusions.',now,now);appendEvent(id,'matter.created',actor,{name:String(input.name).trim()});db.exec('COMMIT');return get(id)}catch(e){db.exec('ROLLBACK');throw e}};
 const listAudit=(matterId,limit=500)=>db.prepare('SELECT * FROM tmnlf_events WHERE matter_id=? ORDER BY created_at DESC,rowid DESC LIMIT ?').all(matterId,Math.min(Number(limit)||500,1000)).map(r=>({id:r.id,matterId:r.matter_id,eventType:r.event_type,actor:r.actor,payload:JSON.parse(r.payload_json),createdAt:r.created_at}));
 return {db,list,get,create,appendEvent,listAudit,close:()=>db.close()};
}
