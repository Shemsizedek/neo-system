// Dependency-injected pg-style client. This file is NOT imported by staging HTTP.
export function createPostgresDeviceStore(db) {
 if(!db || typeof db.query!=='function')throw Error('database_required');
 return Object.freeze({
   async list(subject) {
     const result=await db.query(
       'SELECT id,type,label,created_at AS "createdAt",revoked_at AS "revokedAt" FROM noogle_connect_devices WHERE subject_id=$1 ORDER BY created_at DESC LIMIT 100',
       [subject]);
     return result.rows;
   },
   async findByKey(subject,key) {
     const result=await db.query(
       'SELECT id FROM noogle_connect_devices WHERE subject_id=$1 AND public_key_hash=$2 AND revoked_at IS NULL LIMIT 1',
       [subject,key]);
     return result.rows[0] || null;
   },
   async insert(record) {
     await db.query(
       'INSERT INTO noogle_connect_devices(id,subject_id,type,label,public_key_hash,created_at,revoked_at) VALUES($1,$2,$3,$4,$5,$6,NULL)',
       [record.id,record.subject,record.type,record.label,record.publicKeyHash,record.createdAt]);
   },
   async renameIfOwned(subject,id,label) {
     const result=await db.query('UPDATE noogle_connect_devices SET label=$3 WHERE subject_id=$1 AND id=$2 AND revoked_at IS NULL RETURNING id',[subject,id,label]);
     return result.rows.length===1;
   },
   async revokeIfOwned(subject,id,now) {
     const result=await db.query(
       'UPDATE noogle_connect_devices SET revoked_at=$3 WHERE subject_id=$1 AND id=$2 AND revoked_at IS NULL RETURNING id',
       [subject,id,now]);
     return result.rows.length===1;
   }
 });
}
