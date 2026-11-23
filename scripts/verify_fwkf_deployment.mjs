#!/usr/bin/env node
import assert from "node:assert/strict";
const base=(process.argv[2]||"https://worldcafe.holytemples.org").replace(/\/$/,"");
const u=new URL(base);assert.equal(u.protocol,"https:");
assert.ok(["worldcafe.holytemples.org","fwkf-worldcafe-staging.onrender.com"].includes(u.hostname));
async function read(route,marker){
 const response=await fetch(base+route,{redirect:"error",signal:AbortSignal.timeout(15000),headers:{"cache-control":"no-cache"}});
 assert.equal(response.status,200,"HTTP error on "+route+": "+response.status);
 const body=await response.text();assert.ok(body.includes(marker),"Missing "+marker+" on "+route);
 return body;
}
const main=await read("/","Free World Knowledge Foundation");
assert.ok(main.includes('class="navlinks"'),"Original Foundation navigation not live");
assert.ok(main.includes('href="/world-cafe.html"'),"No World Café launch button");
assert.ok(main.includes('rel="canonical" href="https://worldcafe.holytemples.org/"'));
await read("/world-cafe.html","Good conversations. New ideas.");
await read("/events.html","World Café Events");
await read("/conversations.html","World Café Conversations");
await read("/cafes.html","Knowledge Cafés");
await read("/forum.html","Free World Knowledge Forum");
await read("/knowledge.html","Knowledge");
const investor=await read("/investor-relations.html","Investor Relations");
assert.ok(investor.includes('name="robots" content="noindex,follow"'),"Investor Relations publication guard missing");
const robots=await read("/robots.txt","Sitemap: https://worldcafe.holytemples.org/sitemap.xml");
assert.ok(!robots.includes("Disallow: /"),"Public site blocked by robots.txt");
await read("/sitemap.xml","<urlset");
await read("/site.css","--cream:");
const feed=JSON.parse(await read("/knowledge-index.json","Free World Knowledge Index"));
assert.equal(feed.indicators.length,8);assert.ok(feed.indicators.every(v=>v.value===null));
console.log(JSON.stringify({live:true,host:u.hostname,webPages:8,hasOriginalHomepage:true,newCafeExperience:true,seoSitemap:true,consentSensitiveOperations:false},null,2));
