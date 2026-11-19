import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {createPostgresNeoKeyStore} from '../neo-key-postgres-store.mjs';
import {randomBytes,createHash} from 'node:crypto';

// Never auto-connect to Neon, Render or a production DSN.
// This module requires an explicitly named ephemeral, loopback CI DB.
const connectionString=process.env.NEO_KEY_EPHEMERAL_POSTGRES_URL;
if (!connectionString) {
  test('isolated PostgreSQL integration requires ephemeral service', {skip:true},()=>{});
} else {
  test('real PostgreSQL enforces bootstrap, concurrent replay and last-key protection',async()=>{
    const url=new URL(connectionString);
    assert.equal(url.hostname,'127.0.0.1');
    assert.equal(url.pathname,'/neo_key_gate4');
    const pool=new pg.Pool({connectionString,max:8,connectionTimeoutMillis:5000});
    try {
      const schema=await readFile(new URL('../sql/003_neo_key_credentials.sql',import.meta.url),'utf8');
      await pool.query(schema);
      const store=createPostgresNeoKeyStore(pool);
      const subject=`test-${randomBytes(8).toString('hex')}`;
      const rpId='connect.example.test',origin=`https://${rpId}`,now=Date.now();
      const user=await store.getOrCreateUserHandle(subject,randomBytes(32).toString('base64url'));
      assert.equal(user.length,43);
      assert.equal(await store.getOrCreateUserHandle(subject,randomBytes(32).toString('base64url')),user);
      async function challenge(method,ref){
        const hash=createHash('sha256').update(randomBytes(32)).digest('hex');
        await store.insertRegistrationChallenge({subject,rpId,origin,
          challengeHash:hash,expiresAt:now+120000,method,authorizationRef:`${subject}-${ref}`});
        return {subject,rpId,origin,challengeHash:hash,now,credentialId:`key-${ref}-${randomBytes(5).toString('hex')}`,publicKeyPem:'TEST ONLY PUBLIC KEY',signCount:0};
      }
      const invalid=await challenge('verified-existing-passkey','invalid');
      assert.equal(await store.registerAtomic(invalid),false);
      const bootstrap=await challenge('verified-operator-bootstrap','bootstrap');
      const [x,y]=await Promise.all([store.registerAtomic(bootstrap),store.registerAtomic(bootstrap)]);
      assert.deepEqual([x,y].sort(),[false,true]);
      const secondBootstrap=await challenge('verified-operator-bootstrap','rebootstrap');
      assert.equal(await store.registerAtomic(secondBootstrap),false);
      const secondary=await challenge('verified-existing-passkey','secondary');
      assert.equal(await store.registerAtomic(secondary),true);
      const rows=await pool.query('SELECT credential_id FROM neo_key_credentials WHERE subject_id=$1 AND revoked_at IS NULL',[subject]);
      assert.equal(rows.rows.length,2);
      const [r1,r2]=await Promise.all([
        store.revokeAtomic({subject,rpId,targetCredentialId:bootstrap.credentialId,backupCredentialId:secondary.credentialId,now:now+1}),
        store.revokeAtomic({subject,rpId,targetCredentialId:bootstrap.credentialId,backupCredentialId:secondary.credentialId,now:now+1})
      ]);
      assert.deepEqual([r1,r2].sort(),[false,true]);
      assert.equal(await store.revokeAtomic({subject,rpId,targetCredentialId:secondary.credentialId,backupCredentialId:bootstrap.credentialId,now:now+2}),false);
      const remaining=await pool.query('SELECT credential_id FROM neo_key_credentials WHERE subject_id=$1 AND revoked_at IS NULL',[subject]);
      assert.deepEqual(remaining.rows.map(v=>v.credential_id),[secondary.credentialId]);
      const audited=await pool.query('SELECT event_type FROM neo_key_audit_events WHERE subject_id=$1 ORDER BY event_id',[subject]);
      assert.deepEqual(audited.rows.map(v=>v.event_type),['enrolled','enrolled','revoked']);
    }finally{await pool.end();}
  });
}
