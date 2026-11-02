import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const file=readFileSync("apps/fwkf-forum/admin/prepare-invitation.sql","utf8");
test("Forum invitation is never an automatic account approval",()=>{
 assert.match(file,/['"]pending['"]/);
 assert.doesNotMatch(file,/['"]active['"]/);
 assert.match(file,/ON CONFLICT \(auth_subject\) DO NOTHING/);
});
test("Forum invite requires actual verified and unbanned Neon Auth identity",()=>{
 assert.match(file,/neon_auth\."user"/);
 assert.match(file,/"emailVerified" IS TRUE/);
 assert.match(file,/"banned" IS DISTINCT FROM TRUE/);
 assert.match(file,/u\.id::text = \$1::text/);
});
test("Invites are parameterized, not seeded with personal or fake identities",()=>{
 assert.match(file,/\$2::text/);
 assert.doesNotMatch(file,/@(?:gmail|agentmail|holytemples)\./i);
 assert.doesNotMatch(file,/DROP|TRUNCATE|DELETE\s+FROM|GRANT\s+ALL/i);
});
