import {mkdirSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {DatabaseSync} from 'node:sqlite'

const defaultPath=resolve(process.cwd(),process.env.NEO_TRIBUNAL_DB || '.data/neo-tribunal.sqlite')
mkdirSync(dirname(defaultPath),{recursive:true})

export function openTribunalDb(path=defaultPath){
  const db=new DatabaseSync(path)
  db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS schema_meta(version INTEGER NOT NULL,applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,display_name TEXT NOT NULL,password_hash TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS password_resets(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TEXT NOT NULL,used_at TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS workspaces(id TEXT PRIMARY KEY,name TEXT NOT NULL,created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS memberships(workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL,created_at TEXT NOT NULL,PRIMARY KEY(workspace_id,user_id));
    CREATE TABLE IF NOT EXISTS invitations(token_hash TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,email TEXT NOT NULL,role TEXT NOT NULL,expires_at TEXT NOT NULL,accepted_at TEXT,invited_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS cases(claim_no TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,envelope_json TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 1,updated_at TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS efiles(filing_id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,claim_no TEXT NOT NULL,envelope_json TEXT NOT NULL,filed_by TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS notices(notice_id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,claim_no TEXT NOT NULL,envelope_json TEXT NOT NULL,status TEXT NOT NULL,updated_at TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS hearings(hearing_id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,claim_no TEXT NOT NULL,envelope_json TEXT NOT NULL,starts_at TEXT NOT NULL,status TEXT NOT NULL,updated_at TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS delivery_attempts(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,notice_id TEXT NOT NULL,adapter TEXT NOT NULL,destination TEXT NOT NULL,status TEXT NOT NULL,provider_ref TEXT,error TEXT,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS communication_templates(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,name TEXT NOT NULL,channel TEXT NOT NULL,subject_template TEXT NOT NULL,body_template TEXT NOT NULL,created_by TEXT NOT NULL,updated_at TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS provider_configs(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,provider_type TEXT NOT NULL,label TEXT NOT NULL,config_envelope TEXT NOT NULL,enabled INTEGER NOT NULL DEFAULT 0,created_by TEXT NOT NULL,updated_at TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS communication_outbox(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,notice_id TEXT,channel TEXT NOT NULL,destination TEXT NOT NULL,subject TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL,attempt_count INTEGER NOT NULL DEFAULT 0,next_attempt_at TEXT,last_error TEXT,provider_ref TEXT,receipt_json TEXT,created_by TEXT NOT NULL,updated_at TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS calendar_exports(id TEXT PRIMARY KEY,workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,hearing_id TEXT NOT NULL,format TEXT NOT NULL,payload_hash TEXT NOT NULL,created_by TEXT NOT NULL,created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS audit_log(seq INTEGER PRIMARY KEY AUTOINCREMENT,workspace_id TEXT NOT NULL,actor_user_id TEXT NOT NULL,action TEXT NOT NULL,subject TEXT NOT NULL,payload_hash TEXT NOT NULL,previous_hash TEXT,entry_hash TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_audit_workspace_seq ON audit_log(workspace_id,seq);
    CREATE INDEX IF NOT EXISTS idx_efiles_workspace_claim ON efiles(workspace_id,claim_no);
    CREATE INDEX IF NOT EXISTS idx_notices_workspace_claim ON notices(workspace_id,claim_no);
    CREATE INDEX IF NOT EXISTS idx_hearings_workspace_claim ON hearings(workspace_id,claim_no);
    CREATE INDEX IF NOT EXISTS idx_delivery_workspace_notice ON delivery_attempts(workspace_id,notice_id);
    CREATE INDEX IF NOT EXISTS idx_templates_workspace ON communication_templates(workspace_id,created_at);
    CREATE INDEX IF NOT EXISTS idx_outbox_workspace_status ON communication_outbox(workspace_id,status,next_attempt_at);
    CREATE INDEX IF NOT EXISTS idx_calendar_workspace_hearing ON calendar_exports(workspace_id,hearing_id);
  `)
  const current=db.prepare('SELECT MAX(version) AS version FROM schema_meta').get()?.version||0
  if(current<1)db.prepare('INSERT INTO schema_meta(version,applied_at) VALUES(1,?)').run(new Date().toISOString())
  if(current<2)db.prepare('INSERT INTO schema_meta(version,applied_at) VALUES(2,?)').run(new Date().toISOString())
  if(current<3)db.prepare('INSERT INTO schema_meta(version,applied_at) VALUES(3,?)').run(new Date().toISOString())
  return db
}
