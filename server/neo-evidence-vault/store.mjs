import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';

export function createEvidenceVault(path='data/neo-evidence-vault.sqlite'){
  const db=new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS evidence_records(
      id TEXT PRIMARY KEY,
      asset TEXT NOT NULL,
      title TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_url TEXT,
      issuer TEXT,
      jurisdiction TEXT,
      claim_type TEXT,
      observed_at TEXT,
      note TEXT,
      review_status TEXT NOT NULL DEFAULT 'UNREVIEWED',
      reviewer TEXT,
      reviewed_at TEXT,
      review_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_evidence_asset_created ON evidence_records(asset,created_at DESC);
    CREATE TABLE IF NOT EXISTS evidence_events(
      id TEXT PRIMARY KEY,
      evidence_id TEXT NOT NULL,
      asset TEXT NOT NULL,
      event_type TEXT NOT NULL,
      actor TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(evidence_id) REFERENCES evidence_records(id)
    );
    CREATE INDEX IF NOT EXISTS idx_evidence_events_asset ON evidence_events(asset,created_at DESC);
  `);

  const mapRecord=row=>row?{
    id:row.id,asset:row.asset,title:row.title,sourceType:row.source_type,sourceUrl:row.source_url||undefined,
    issuer:row.issuer||undefined,jurisdiction:row.jurisdiction||undefined,claimType:row.claim_type||undefined,
    observedAt:row.observed_at||undefined,note:row.note||undefined,reviewStatus:row.review_status,
    reviewer:row.reviewer||undefined,reviewedAt:row.reviewed_at||undefined,reviewNote:row.review_note||undefined,
    createdAt:row.created_at,updatedAt:row.updated_at,
  }:null;

  const appendEvent=(evidenceId,asset,eventType,actor,payload={})=>{
    const event={id:randomUUID(),evidenceId,asset,eventType,actor,payload,createdAt:new Date().toISOString()};
    db.prepare('INSERT INTO evidence_events(id,evidence_id,asset,event_type,actor,payload_json,created_at) VALUES(?,?,?,?,?,?,?)')
      .run(event.id,evidenceId,asset,eventType,actor,JSON.stringify(payload),event.createdAt);
    return event;
  };

  const createEvidence=(input,actor='system')=>{
    if(!input?.asset||!input?.title||!input?.sourceType) throw new Error('asset_title_source_type_required');
    const now=new Date().toISOString();
    const record={...input,id:input.id||randomUUID(),asset:String(input.asset).toUpperCase(),reviewStatus:'UNREVIEWED',createdAt:now,updatedAt:now};
    db.exec('BEGIN IMMEDIATE');
    try{
      db.prepare(`INSERT INTO evidence_records(id,asset,title,source_type,source_url,issuer,jurisdiction,claim_type,observed_at,note,review_status,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(record.id,record.asset,record.title,record.sourceType,record.sourceUrl||null,record.issuer||null,record.jurisdiction||null,record.claimType||null,record.observedAt||null,record.note||null,record.reviewStatus,now,now);
      appendEvent(record.id,record.asset,'evidence.ingested',actor,{title:record.title,sourceType:record.sourceType,sourceUrl:record.sourceUrl||null});
      db.exec('COMMIT');
      return record;
    }catch(error){db.exec('ROLLBACK');throw error;}
  };

  const reviewEvidence=(id,{status,reviewer,note}={})=>{
    if(!['ACCEPTED','REJECTED','CONFLICTED'].includes(status)) throw new Error('invalid_review_status');
    if(!reviewer) throw new Error('reviewer_required');
    const current=mapRecord(db.prepare('SELECT * FROM evidence_records WHERE id=?').get(id));
    if(!current) return null;
    const now=new Date().toISOString();
    db.exec('BEGIN IMMEDIATE');
    try{
      db.prepare('UPDATE evidence_records SET review_status=?,reviewer=?,reviewed_at=?,review_note=?,updated_at=? WHERE id=?')
        .run(status,reviewer,now,note||null,now,id);
      appendEvent(id,current.asset,'evidence.reviewed',reviewer,{from:current.reviewStatus,to:status,note:note||null});
      db.exec('COMMIT');
      return mapRecord(db.prepare('SELECT * FROM evidence_records WHERE id=?').get(id));
    }catch(error){db.exec('ROLLBACK');throw error;}
  };

  const listEvidence=(asset,limit=200)=>db.prepare('SELECT * FROM evidence_records WHERE asset=? ORDER BY created_at DESC, rowid DESC LIMIT ?').all(String(asset).toUpperCase(),Math.min(Number(limit)||200,500)).map(mapRecord);
  const getEvidence=id=>mapRecord(db.prepare('SELECT * FROM evidence_records WHERE id=?').get(id));
  const listAudit=(asset,limit=500)=>db.prepare('SELECT * FROM evidence_events WHERE asset=? ORDER BY created_at DESC, rowid DESC LIMIT ?').all(String(asset).toUpperCase(),Math.min(Number(limit)||500,1000)).map(row=>({id:row.id,evidenceId:row.evidence_id,asset:row.asset,eventType:row.event_type,actor:row.actor,payload:JSON.parse(row.payload_json),createdAt:row.created_at}));

  return {db,createEvidence,reviewEvidence,listEvidence,getEvidence,listAudit,close:()=>db.close()};
}
