import assert from "node:assert/strict";
import fs from "node:fs";
const p="apps/fwkf-worldcafe/public/";
for(const f of ["favicon.svg","logo.svg"]){
 const s=fs.readFileSync(p+f,"utf8");
 assert.ok(s.startsWith("<svg"),f+" is not SVG");
 assert.ok(s.includes("viewBox"),f+" needs scalable viewBox");
 assert.ok(s.includes("Free World Knowledge Foundation"),f+" missing accessible name");
}
for(const f of ["index.html","world-cafe.html","events.html","conversations.html","cafes.html","forum.html","knowledge.html","investor-relations.html"]){
 const s=fs.readFileSync(p+f,"utf8");
 assert.ok(s.includes('href="/favicon.svg"'),f+" lacks favicon");
 assert.ok(s.includes('content="https://worldcafe.holytemples.org/logo.svg"'),f+" lacks social image");
}
const prev=fs.readFileSync(p+"forum-preview.html","utf8");
assert.ok(prev.includes('name="robots" content="noindex,nofollow"'));
assert.ok(prev.includes("posting closed")&&prev.includes("No public questions yet")&&prev.includes("Member"));
assert.ok(!/<form\b/i.test(prev),"Preview must not accept signups");
assert.ok(!/localhost|postgres|DATABASE_URL|api_key|password/i.test(prev),"Preview leaked server details");
const intro=fs.readFileSync(p+"forum.html","utf8");
assert.ok(intro.includes('href="/forum-preview.html"'));
const fromSource=fs.readFileSync("apps/fwkf-forum/web/preview.html","utf8");
assert.equal(prev,fromSource,"Forum preview drift");
console.log("PASS: eight branded pages, two accessible SVGs, and a read-only noindex Forum preview with no signup/data collection.");
