#!/usr/bin/env node
// Read-only cloud website smoke test; independent of developer workstation for hosting.
import assert from "node:assert/strict";
const base=(process.argv[2]||"https://worldcafe.holytemples.org").replace(/\/$/,"");
const target=new URL(base);
assert.equal(target.protocol,"https:");
assert.ok(["worldcafe.holytemples.org","fwkf-worldcafe-staging.onrender.com"].includes(target.hostname));
async function load(route,needle){
 const r=await fetch(base+route,{redirect:"error",signal:AbortSignal.timeout(15000),headers:{"cache-control":"no-cache"}});
 assert.equal(r.status,200,route+": HTTP "+r.status);
 const text=await r.text();
 assert.ok(text.includes(needle),route+": content not deployed");
 return text;
}
const pages=[
 ["/","Good conversations. New ideas. Stronger communities."],
 ["/events.html","World Café Events"],
 ["/conversations.html","World Café Conversations"],
 ["/cafes.html","Knowledge Cafés, city by city."],
 ["/forum.html","Free World Knowledge Forum"],
 ["/knowledge.html","Knowledge, shared and explored"],
 ["/investor-relations.html","Investor Relations"]
];
for(const [route,needle] of pages){const html=await load(route,needle);if(route!=="/investor-relations.html")assert.ok(!html.includes("2197274275635"),"Token ID on a non-investor page: "+route);}
await load("/site.css","--cream:");
const feed=JSON.parse(await load("/knowledge-index.json","Free World Knowledge Index"));
assert.ok(feed.indicators.length===8 && feed.indicators.every(x=>x.value===null));
assert.ok(!JSON.stringify(feed).includes("2197274275635"),"Token info should not be in public index");
console.log(JSON.stringify({target:base,checks:9,live:true,penguinDependency:false,forumPostingEnabled:false,physicalCafeLocationsVerified:false},null,2));
