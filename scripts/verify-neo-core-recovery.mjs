#!/usr/bin/env node
// Non-destructive NEO Core outage gate. A 200 public shell is NOT sufficient.
// Use only when verifying a production recovery or candidate origin.
import assert from "node:assert/strict";
const args=process.argv.slice(2);
const origin=args[0]||"https://neo-system.onrender.com";
const base=new URL(origin);
assert.equal(base.protocol,"https:","TLS required");
assert.ok(["neo-system.onrender.com","neo.holytemples.org"].includes(base.hostname),"Do not probe unapproved origins");
async function read(path) {
 const r=await fetch(base.origin+path,{redirect:"manual",signal:AbortSignal.timeout(15000),headers:{"cache-control":"no-cache"}});
 const body=await r.text();
 return {status:r.status,contentType:r.headers.get("content-type"),body:body.slice(0,1500)};
}
const checks={};
for(const path of ["/health","/neosync/","/corpus/"]){
 try{const r=await read(path);checks[path]={status:r.status,preview:r.body.slice(0,140)};}
 catch(e){checks[path]={error:e.name||"network_error"};}
}
const health=checks["/health"];
const realHealth=health?.status===200&&!/public-recovery|temple-continuity/i.test(health.preview||"");
const neosync=checks["/neosync/"]?.status===200&&!/is recovering|service recovery/i.test(checks["/neosync/"].preview||"");
const corpus=checks["/corpus/"]?.status===200&&!/is still recovering|service recovery/i.test(checks["/corpus/"].preview||"");
const result={origin:base.origin,checks,backendResponds:realHealth,neosyncResponsive:neosync,corpusResponsive:corpus,fullyVerified:false};
console.log(JSON.stringify(result,null,2));
if(!realHealth||!neosync||!corpus){console.error("NEO_CORE_RECOVERY_NOT_VERIFIED");process.exitCode=1}
else{console.log("NEO_CORE_PUBLIC_ROUTES_RESPOND; AUTH_AND_DATA_WORKFLOWS_STILL_REQUIRE_SEPARATE_VALIDATION")}
