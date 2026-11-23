// Non-mutating end-to-end tests for the isolated Neon Forum staging API.
// Never sends member credentials or personal data.
import assert from "node:assert/strict";
const root="https://br-misty-sun-b850yi7t-fwkfdata.compute.c-14.us-east-1.aws.neon.tech";
const call=async(path,opts={})=>fetch(root+path,{redirect:"error",signal:AbortSignal.timeout(15000),...opts});
let r=await call("/health");assert.equal(r.status,200);
let o=await r.json();assert.equal(o.status,"private_alpha");assert.equal(o.posting,false);assert.equal(o.registration,false);
assert.equal(r.headers.get("cache-control"),"no-store");
r=await call("/communities");assert.equal(r.status,200);
o=await r.json();assert.deepEqual(o.communities,[]);assert.equal(o.posting,false);
r=await call("/me");assert.equal(r.status,401);assert.equal((await r.json()).error,"AUTH_REQUIRED");
r=await call("/questions",{method:"POST",headers:{"content-type":"application/json"},body:"{}"});
assert.equal(r.status,405);assert.equal((await r.json()).error,"POSTING_CLOSED");
r=await call("/health",{headers:{origin:"https://invalid.example"}});assert.equal(r.status,403);
assert.equal(r.headers.get("access-control-allow-origin"),null);
r=await call("/health",{headers:{origin:"https://worldcafe.holytemples.org"}});assert.equal(r.status,200);
assert.equal(r.headers.get("access-control-allow-origin"),"https://worldcafe.holytemples.org");
r=await call("/me",{method:"OPTIONS",headers:{origin:"https://worldcafe.holytemples.org"}});
assert.equal(r.status,204);
r=await call("/unknown-route");assert.equal(r.status,404);
console.log(JSON.stringify({checks:8,status:"pass",host:new URL(root).hostname,postingEnabled:false,publicCommunities:0,anonymousMemberAccess:false},null,2));
