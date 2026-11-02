import test from "node:test";
import assert from "node:assert/strict";
import {createForumDataHandler} from "../functions/data/handler.mjs";
const env={DATABASE_URL:"test-placeholder",NEON_AUTH_BASE_URL:"https://auth.example.invalid/neondb/auth",NEON_AUTH_JWKS_URL:"https://auth.example.invalid/keys"};
function create(){
 const calls=[];
 const pool={query:async query=>{calls.push(query);return {rows:[]}}};
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
 assert.ok(calls[0].text.includes("status='active' AND visibility='public'"));
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
