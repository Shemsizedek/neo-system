import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
const root=path.resolve(process.argv[2]||"apps/fwkf-worldcafe/public");
const pages=["index.html","world-cafe.html","events.html","conversations.html","cafes.html","forum.html","knowledge.html","investor-relations.html"];
const files=new Map(pages.map(p=>[p,fs.readFileSync(path.join(root,p),"utf8")]));
const canon=p=>"https://worldcafe.holytemples.org/"+(p==="index.html"?"":p);
const original=files.get("index.html"),cafe=files.get("world-cafe.html");
const origSections=["about","founder","vision","smart-city","world-cafe","knowledge-hub","value-chain","how-it-works","academy","index","wealth-fund","tokenized-assets","innovation-lab","opportunity-board","research","partnerships","contact"];
for(const id of origSections)assert.ok(original.includes('id="'+id+'"'),"Original section missing "+id);
assert.ok(original.includes('class="navlinks"') && original.includes('class="legacy-mobile-nav"'),"Original navigation not preserved");
assert.ok(original.includes('href="/world-cafe.html"'),"Original homepage must link to new World Café");
assert.ok(cafe.includes("Good conversations. New ideas."),"New design must be preserved as a distinct page");
assert.ok(cafe.includes('href="/"'),"New design must link back to Foundation");
const privateText=[/project\s*144/i,/sponsor-described/i,/original\s*archive/i,/source\s*project/i,/crown\s*chain/i,/production\s*write/i,/penguin/i,/2197274275635/];
const investorOnly=[/\bbitcoin\b/i,/\bcounterparty\b/i,/token\s*(sale|holder|market)/i];
for(const [p,html] of files){
 assert.ok(html.includes("Free World Knowledge Foundation"),"Foundation name missing: "+p);
 assert.ok(html.includes('rel="canonical" href="'+canon(p)+'"'),"Missing/self-inconsistent canonical: "+p);
 assert.ok(html.includes('name="description"'),"Description missing: "+p);
 assert.ok(html.includes('property="og:title"')||p==="index.html"&&html.includes('property="og:title"'),"Social title missing: "+p);
 assert.ok(html.includes('property="og:url"'),"Social URL missing: "+p);
 assert.ok(html.includes('name="robots" content="'+(p==="investor-relations.html"?"noindex,follow":"index,follow,max-image-preview:large")+'"'),"Wrong index policy: "+p);
 assert.ok(!/<form\b/i.test(html),"Unapproved form: "+p);
 for(const rule of privateText)assert.ok(!rule.test(html),"Private operational copy "+rule+" on "+p);
 if(p!=="investor-relations.html")for(const rule of investorOnly)assert.ok(!rule.test(html),"Asset terms outside IR: "+p);
 if(p!=="index.html")assert.ok(html.includes('/site.css'),"Modern CSS missing: "+p);
 for(const m of html.matchAll(/href="(\/[^"#?]+)"/g)){
  assert.ok(fs.existsSync(path.join(root,m[1].slice(1))),"Internal link broken in "+p+": "+m[1]);
 }
}
const css=fs.readFileSync(path.join(root,"site.css"),"utf8");
assert.ok(css.includes("@media")&&css.includes(":focus-visible"),"Responsive/accessibility CSS missing");
const robots=fs.readFileSync(path.join(root,"robots.txt"),"utf8");
assert.ok(/Allow: \//.test(robots)&&!/Disallow: \//.test(robots),"robots.txt still blocks public site");
assert.ok(robots.includes("https://worldcafe.holytemples.org/sitemap.xml"),"Missing sitemap location");
const sitemap=fs.readFileSync(path.join(root,"sitemap.xml"),"utf8");
for(const p of pages.filter(p=>p!=="investor-relations.html"))assert.ok(sitemap.includes("<loc>"+canon(p)+"</loc>"),"Missing sitemap URL: "+p);
assert.ok(!sitemap.includes("investor-relations.html"),"Investor Relations must remain out of sitemap");
const feed=JSON.parse(fs.readFileSync(path.join(root,"knowledge-index.json"),"utf8"));
const alias=JSON.parse(fs.readFileSync(path.join(root,"knowindex.json"),"utf8"));
assert.deepEqual(feed,alias);
assert.equal(feed.indicators.length,8);
assert.ok(feed.indicators.every(x=>x.value===null));
assert.ok(!/\btoken\b|bitcoin|private|asset_id|2197274275635/i.test(JSON.stringify(feed)),"Investor or private fields in knowledge dataset");
console.log("PASS: original Foundation menu & 17 sections restored; modern World Café kept separately; 8 pages SEO/canonical/privacy checked; 7 sitemap URLs; knowledge feed safe.");
