import {DatabaseSync} from 'node:sqlite';
export function createNoogleOidcStore(path){
 if(typeof path!=='string'||!path||path===':memory:')throw Error('persistent_oidc_store_required');
 const db=new DatabaseSync(path);db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS noogle_oidc_records(key TEXT PRIMARY KEY,expires_at INTEGER NOT NULL,record TEXT NOT NULL)');
 return Object.freeze({async issue(key,row){db.prepare('INSERT INTO noogle_oidc_records VALUES(?,?,?)').run(key,row.expiresAt,JSON.stringify(row));},async take(key){const row=db.prepare('DELETE FROM noogle_oidc_records WHERE key=? RETURNING record').get(key);return row?JSON.parse(row.record):null;},async read(key){const row=db.prepare('SELECT record FROM noogle_oidc_records WHERE key=?').get(key);return row?JSON.parse(row.record):null;},async prune(now){return db.prepare('DELETE FROM noogle_oidc_records WHERE expires_at<=?').run(now).changes;},close(){db.close();}});
}
