import test from 'node:test';
import assert from 'node:assert/strict';
import {assertScratchDatabaseUrl,SCRATCH_DB} from './gate11-config.mjs';

const TEST_PASSWORD='test_password_not_a_real_credential';
const good=()=> 'postgresql://'+SCRATCH_DB.role+':'+TEST_PASSWORD+'@'+SCRATCH_DB.endpointHost+'/'+SCRATCH_DB.database+'?sslmode=require';
test('Gate11 scratch URL pins endpoint, restricted login, database and TLS',()=>{
 const check=assertScratchDatabaseUrl(good());
 assert.equal(check.branchId,'br-holy-lab-ar0at3wz');
 assert.equal(check.role,'neo_flipper_gate9_app');
 assert.equal(check.tlsRequired,true);
 assert.equal(JSON.stringify(check).includes(TEST_PASSWORD),false);
});
test('rejects wrong database and parent endpoint',()=>{
 assert.throws(()=>assertScratchDatabaseUrl(good().replace(SCRATCH_DB.database,'neondb')), /scratch_connection_identity_mismatch/);
 assert.throws(()=>assertScratchDatabaseUrl(good().replace(SCRATCH_DB.endpointHost,'ep-other.us-west-2.aws.neon.tech')), /scratch_connection_identity_mismatch/);
});
test('rejects database owner credentials and missing TLS',()=>{
 assert.throws(()=>assertScratchDatabaseUrl(good().replace(SCRATCH_DB.role,'neondb_owner')), /scratch_connection_identity_mismatch/);
 assert.throws(()=>assertScratchDatabaseUrl(good().replace('sslmode=require','sslmode=disable')), /scratch_ssl_required/);
});
test('rejects query-string credentials and secret-bearing search options',()=>{
 assert.throws(()=>assertScratchDatabaseUrl(good()+'&password=leak'), /scratch_connection_option_forbidden/);
});
test('rejects missing credential and URL fragments',()=>{
 assert.throws(()=>assertScratchDatabaseUrl(good().replace(':'+TEST_PASSWORD+'@','@')), /scratch_connection_identity_mismatch/);
 assert.throws(()=>assertScratchDatabaseUrl(good()+'#leak'), /scratch_connection_identity_mismatch/);
});
