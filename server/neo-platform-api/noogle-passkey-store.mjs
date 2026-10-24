import {DatabaseSync} from 'node:sqlite';
export function createNooglePasskeyStore(path){
 if(typeof path!=='string'||!path||path===':memory:')throw Error('persistent_passkey_store_required');
 const db=new DatabaseSync(path);db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS noogle_ceremonies(id TEXT PRIMARY KEY,purpose TEXT NOT NULL,browser_hash TEXT NOT NULL,expires_at INTEGER NOT NULL,record TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS noogle_accounts(subject TEXT PRIMARY KEY,disabled INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS noogle_credentials(id TEXT PRIMARY KEY,subject TEXT NOT NULL,counter INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0,record TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS noogle_sessions(hash TEXT PRIMARY KEY,subject TEXT NOT NULL,credential_id TEXT NOT NULL,expires_at INTEGER NOT NULL,auth_time INTEGER NOT NULL);`);
 const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const result=fn();db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
 return Object.freeze({
  async issue(id,row){db.prepare('INSERT INTO noogle_ceremonies VALUES(?,?,?,?,?)').run(id,row.purpose,row.browserHash,row.expiresAt,JSON.stringify(row));},
  async take(id,purpose,browserHash,now){const row=db.prepare('DELETE FROM noogle_ceremonies WHERE id=? AND purpose=? AND browser_hash=? AND expires_at>? RETURNING record').get(id,purpose,browserHash,now);return row?JSON.parse(row.record):null;},
  async register(row){transaction(()=>{db.prepare('INSERT INTO noogle_accounts(subject) VALUES(?)').run(row.subject);db.prepare('INSERT INTO noogle_credentials(id,subject,counter,record) VALUES(?,?,?,?)').run(row.id,row.subject,row.counter,JSON.stringify(row));});},
  async credential(id){if(typeof id!=='string')return null;const row=db.prepare('SELECT counter,record FROM noogle_credentials WHERE id=? AND revoked=0').get(id);return row?{...JSON.parse(row.record),counter:row.counter}:null;},
  async active(subject){return db.prepare('SELECT subject FROM noogle_accounts WHERE subject=? AND disabled=0').get(subject)!==undefined;},
  async commitLogin(p){return transaction(()=>{const row=db.prepare('UPDATE noogle_credentials SET counter=? WHERE id=? AND subject=? AND counter=? AND revoked=0 AND EXISTS(SELECT 1 FROM noogle_accounts WHERE subject=? AND disabled=0) RETURNING id').get(p.newCounter,p.credentialId,p.subject,p.oldCounter,p.subject);if(!row)return false;db.prepare('INSERT INTO noogle_sessions VALUES(?,?,?,?,?)').run(p.sessionHash,p.subject,p.credentialId,p.expiresAt,p.authTime);return true;});},
  async session(hash,now){return db.prepare('SELECT s.subject,s.auth_time AS authTime FROM noogle_sessions s JOIN noogle_credentials c ON c.id=s.credential_id WHERE s.hash=? AND s.expires_at>? AND c.revoked=0').get(hash,now)||null;},
  async revokeCredential(subject,id){return db.prepare('UPDATE noogle_credentials SET revoked=1 WHERE subject=? AND id=? AND revoked=0').run(subject,id).changes===1;},
  async disableAccount(subject){return db.prepare('UPDATE noogle_accounts SET disabled=1 WHERE subject=?').run(subject).changes===1;},
  close(){db.close();}
 });
}
