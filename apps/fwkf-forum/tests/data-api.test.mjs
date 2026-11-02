import test from "node:test";
import assert from "node:assert/strict";
import {createForumDataHandler} from "../functions/data/handler.mjs";
const env={DATABASE_URL:"test-placeholder",NEON_AUTH_BASE_URL:"https://auth.example.invalid/neondb/auth",NEON_AUTH_JWKS_URL:"https://auth.example.invalid/keys"};
function create(){
 const calls=[];
 const pool={connect:async()=>({query:async query=>{calls.push(query);return {rows:[]}},release:()=>{calls.push("RELEASE")}})};
 const app=createForumDataHandler({pool,env});
 const call=(pathname,options={})=>app.fetch(new Request("https://staging.example.invalid"+pathname,options));
 return {call,calls};
}
test("health reports posting and registration remain closed",async()=>{
 const {call}=create();
 const r=await call("/health");
 assert.equal(r.status,200);
 assert.equal((await r.json()).posting,false);
});
test("published communities query excludes draft communities",async()=>{
 const {call,calls}=create();
 const r=await call("/communities");
 assert.deepEqual((await r.json()).communities,[]);
 assert.ok(calls.find(x=>typeof x==="object").text.includes("status='active' AND visibility='public'"));
});
test("unknown membership is denied without database lookup",async()=>{
 const {call,calls}=create();
 const r=await call("/me");
 assert.equal(r.status,401);
 assert.equal(calls.length,0);
});
test("posting and moderation endpoints remain disabled",async()=>{
 const {call,calls}=create();
 for(const path of ["/questions","/answers","/votes","/moderation"]){
  const r=await call(path,{method:"POST",body:"{}"});
  assert.equal(r.status,405);
 }
 assert.equal(calls.length,0);
});
test("CORS and unknown routes fail closed",async()=>{
 const {call}=create();
 assert.equal((await call("/health",{headers:{origin:"https://invalid.example"}})).status,403);
 assert.equal((await call("/nothere")).status,404);
});

test("every database read runs under non-login reader role and read-only transaction",async()=>{
 const {call,calls}=create();const r=await call("/communities");assert.equal(r.status,200);
 assert.equal(calls[0],"BEGIN READ ONLY");
 assert.equal(calls[1],"SET LOCAL ROLE fwkf_forum_reader");
 assert.equal(calls[3],"COMMIT");assert.equal(calls[4],"RELEASE");
});

test("database role failure fails closed and rolls back without exposing records",async()=>{
 const queries=[];
 const pool={connect:async()=>({query:async command=>{
  queries.push(command);
  if(command==="SET LOCAL ROLE fwkf_forum_reader")throw Error("Role unavailable");
  return {rows:[]};
 },release(){queries.push("RELEASE")}})};
 const app=createForumDataHandler({pool,env});
 const response=await app.fetch(new Request("https://staging.example.invalid/communities"));
 assert.equal(response.status,503);
 assert.deepEqual(await response.json(),{error:"DATA_UNAVAILABLE"});
 assert.ok(queries.includes("ROLLBACK"));
 assert.ok(!queries.includes("COMMIT"));
});
