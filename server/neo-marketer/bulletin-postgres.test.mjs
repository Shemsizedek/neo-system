import test from "node:test";
import assert from "node:assert/strict";
import { persistBulletinPostgres, validateBulletinDatabaseUrl } from "./bulletin-postgres.mjs";

const payload = {
  id:"neo-bulletin-3861-"+"a".repeat(16),
  postId:3861,
  title:"A reviewed bulletin",
  url:"https://holytemples.org/2026/11/10/example/",
  autoPublishSocial:false
};

test("Neon URL allowlist refuses other servers and missing credentials",()=>{
  assert.equal(validateBulletinDatabaseUrl("postgresql://editor:pass@ep-test.us-east-1.aws.neon.tech/neondb"),"postgresql://editor:pass@ep-test.us-east-1.aws.neon.tech/neondb");
  assert.throws(()=>validateBulletinDatabaseUrl("postgres://editor:pass@evil.test/neondb"),/not_approved_neon/);
  assert.throws(()=>validateBulletinDatabaseUrl("postgresql://ep-test.us-east-1.aws.neon.tech/neondb"),/not_approved_neon/);
});
test("insert uses parameterized SQL and no outbound social call",async()=>{
  const calls=[];
  const pool={query:async(sql,parameters)=>{calls.push({sql,parameters});return {rows:[{id:payload.id}]};}};
  const result=await persistBulletinPostgres(payload,pool);
  assert.deepEqual(result,{status:"queued",id:payload.id,distribution:"not_sent"});
  assert.equal(calls.length,1);
  assert.match(calls[0].sql,/ON CONFLICT \(id\) DO NOTHING/);
  assert.equal(calls[0].parameters[0],payload.id);
  assert.match(calls[0].parameters[1],/pending_editorial_marketing_review/);
});
test("exact duplicate is idempotent",async()=>{
  let stored;
  const pool={query:async(sql,parameters)=>{
    if(sql.startsWith("INSERT")){stored=parameters[2];return {rows:[]};}
    return {rows:[{payload_sha256:stored}]};
  }};
  assert.equal((await persistBulletinPostgres(payload,pool)).status,"already_queued");
});
test("same ID with different payload is rejected",async()=>{
  const pool={query:async sql=>sql.startsWith("INSERT")?{rows:[]}:{rows:[{payload_sha256:"0".repeat(64)}]}};
  await assert.rejects(()=>persistBulletinPostgres(payload,pool),/handoff_id_conflict/);
});
test("unavailable connection fails closed",async()=>{
  await assert.rejects(()=>persistBulletinPostgres(payload,null),/bulletin_db_pool_missing/);
});
