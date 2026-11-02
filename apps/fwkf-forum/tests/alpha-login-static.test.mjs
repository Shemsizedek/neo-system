import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
test("invite-only alpha UX cannot register, post, or persist credentials",()=>{
 const html=fs.readFileSync("apps/fwkf-forum/web/alpha-login.html","utf8");
 const code=fs.readFileSync("apps/fwkf-forum/web/alpha-login.mjs","utf8");
 const bridge=fs.readFileSync("apps/fwkf-forum/web/member-session.mjs","utf8");
 assert.ok(html.includes('name="robots" content="noindex,nofollow"'));
 assert.ok(html.includes('autocomplete="current-password"'));
 assert.ok(html.includes("id=\"member-login\" hidden"));
 assert.ok(html.includes("Posting remains disabled"));
 for(const source of [html,code,bridge]){
  assert.ok(!/signUp\s*[.(]|localStorage|sessionStorage|indexedDB|document\.cookie|new\s+WebSocket|api\/posts/i.test(source),"Unsafe signup/storage/write path");
 }
 assert.ok(code.includes("getStatus"));
 assert.ok(code.includes("signOut"));
 assert.ok(bridge.includes('method:"GET"'));
 assert.ok(!bridge.includes('method:"POST"'));
});
