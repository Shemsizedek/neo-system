// World Café public-site gate: no private Project 144 copy, no token details outside IR.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
const root=process.argv[2]||"apps/fwkf-worldcafe/public";
const pages=["index.html","events.html","conversations.html","cafes.html","forum.html","knowledge.html","investor-relations.html"];
const all=new Map(pages.map(p=>[p,fs.readFileSync(path.join(root,p),"utf8")]));
const css=fs.readFileSync(path.join(root,"site.css"),"utf8");
assert.ok(css.includes("@media"),"Responsive styles required");
assert.ok(css.includes(":focus-visible"),"Accessible focus required");
const privateWords=[/project\s*144/i,/sponsor-described/i,/internal\s*gate/i,/original\s*archive/i,/production\s*write/i,/penguin/i,/private conversation/i,/bitcoin\s*commitment/i,/crown\s*chain/i,/asset[_ ]id/i];
for(const [p,html] of all) {
 assert.ok(/<main id="content">/.test(html),p+": accessible main missing");
 assert.ok(html.includes('/site.css'),p+": stylesheet missing");
 assert.ok(html.includes('<nav'),p+": navigation missing");
 assert.ok(html.includes('Free World Knowledge Foundation'),p+": publisher missing");
 assert.ok(html.includes('name="robots" content="noindex,nofollow"'),p+": preview robot control missing");
 assert.ok(!html.toLowerCase().includes('<form'),p+": form without consent backend");
 for(const rule of privateWords)assert.ok(!rule.test(html),p+": public operational copy "+rule);
 if(p!=="investor-relations.html") {
   for(const word of [/\bCounterparty\b/i,/\bBitcoin\b/i,/token\s*(sale|holder|market)/i,/2197274275635/])
     assert.ok(!word.test(html),p+": asset details outside IR");
 }
 for(const m of html.matchAll(/href="(\/[^"#?]+)"/g)){
  const href=m[1];assert.ok(fs.existsSync(path.join(root,href.replace(/^\//,""))),p+": broken internal "+href);
 }
}
assert.ok(all.get("events.html").includes("World Café Events"));
assert.ok(all.get("conversations.html").includes("World Café Conversations"));
assert.ok(all.get("cafes.html").includes("Knowledge Cafés"));
assert.ok(all.get("cafes.html").includes("World Library"));
assert.ok(all.get("forum.html").includes("forum in development")||all.get("forum.html").includes("Community forum in development"));
assert.ok(all.get("forum.html").includes("moderation"));
assert.ok(all.get("investor-relations.html").includes("KNOWINDEX"));
assert.ok(all.get("investor-relations.html").includes("xcp.io/asset/KNOWINDEX"));
const feed=JSON.parse(fs.readFileSync(path.join(root,"knowledge-index.json"),"utf8"));
const alias=JSON.parse(fs.readFileSync(path.join(root,"knowindex.json"),"utf8"));
assert.deepEqual(alias,feed,"Index aliases must remain synchronized");
assert.equal(feed.indicators.length,8);
assert.ok(feed.indicators.every(i=>i.value===null),"Unreviewed measurements must be null");
const serialized=JSON.stringify(feed);
assert.ok(!/asset_id|token|bitcoin|crown_chain|2197274275635|sponsor|project 144/i.test(serialized),"Public JSON must exclude private and investor data");
console.log("World Café public release checks passed: 7 pages, responsive stylesheet, linked routes, privacy and investor separation, clean index feed.");
