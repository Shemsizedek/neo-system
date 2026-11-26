// Explicit opt-in: requires a disposable local PostgreSQL 16+ test database.
// Never pass a real NEO database URL. The test truncates and drops its own table.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createPostgresCeremonyStore} from './postgres-ceremony-store.mjs';
const uri=process.env.NEOPASS_DISPOSABLE_PG_URL;
const approved=(()=>{
  try {
    const u=new URL(uri);
    return ['postgres:', 'postgresql:'].includes(u.protocol) &&
      ['localhost','127.0.0.1','[::1]'].includes(u.hostname) &&
      /test|ci|disposable/.test(u.pathname.toLowerCase());
  } catch {return false;}
})();
test('real PostgreSQL: one-use challenge, expiration, rollback', {skip:!approved&&'requires approved disposable local PostgreSQL URL'},async()=>{
  // Use the reviewed pg dependency; no automatic installation or remote DB.
  const {Pool}=await import('pg');
  const pool=new Pool({connectionString:uri,max:8});
  const rpId='connect.example.test',origin='https://'+rpId;
  const hmacKey=Buffer.alloc(32,0x45);
  let now=1900000000000;
  const makeStore=(query)=>createPostgresCeremonyStore({pool:{query},hmacKey,rpId,origin,now:()=>now});
  const scope={subject:'test-only-subject',sessionKey:'test-only-session-12345678',kind:'registration'};
  try {
    const sql=await readFile(new URL('./sql/004_neopass_staging_ceremonies.sql',import.meta.url),'utf8');
    await pool.query(sql);
    await pool.query('TRUNCATE neopass_staging_ceremonies');
    const store=makeStore((...args)=>pool.query(...args));
    await store.put({...scope,challenge:'A'.repeat(43),expiresAt:now+60000});
    const results=await Promise.all(Array.from({length:32},()=>store.take(scope)));
    assert.equal(results.filter(Boolean).length,1);
    assert.equal(await store.take(scope),null);
    await store.put({...scope,challenge:'B'.repeat(43),expiresAt:now+10});
    now+=11;
    assert.equal(await store.take(scope),null);
    const client=await pool.connect();
    const rollbackScope={...scope,kind:'authentication'};
    try {
      await client.query('BEGIN');
      const transactional=makeStore((...args)=>client.query(...args));
      await transactional.put({...rollbackScope,challenge:'C'.repeat(43),expiresAt:now+60000});
      await client.query('ROLLBACK');
    } catch(error) {
      await client.query('ROLLBACK'); throw error;
    } finally {client.release();}
    assert.equal(await store.take(rollbackScope),null);
  } finally {
    await pool.query('DROP TABLE IF EXISTS neopass_staging_ceremonies');
    await pool.end();
  }
});
