import test from 'node:test';
import assert from 'node:assert/strict';
import {createNeonStagingClient} from './neon-staging-client.mjs';

test('rejects missing and untrusted database URLs',async()=>{
 await assert.rejects(createNeonStagingClient({databaseUrl:''}),/not_configured/);
 await assert.rejects(createNeonStagingClient({databaseUrl:'postgresql://u:p@other.example:5432/db'}),/untrusted_database_host/);
});
test('checks schema without exposing row values',async()=>{
 let queryText;
 class FakePool {
  constructor(options){assert.match(options.connectionString,/sslmode=require/);}
  async query(sql){queryText=sql;return {rows:[{oauth_state:'neofx_auth.oauth_state',broker_tokens:'neofx_auth.broker_tokens'}]};}
  async end(){}
 }
 const client=await createNeonStagingClient({databaseUrl:'postgresql://u:p@db.neon.tech/neofx',PoolCtor:FakePool});
 assert.equal(await client.checkSchema(),true);
 assert.match(queryText,/to_regclass/);
 await client.close();
});
test('returns false for missing schema table',async()=>{
 class FakePool {async query(){return {rows:[{oauth_state:'neofx_auth.oauth_state',broker_tokens:null}]};} async end(){}}
 const client=await createNeonStagingClient({databaseUrl:'postgresql://u:p@db.neon.tech/neofx',PoolCtor:FakePool});
 assert.equal(await client.checkSchema(),false);
 await client.close();
});
