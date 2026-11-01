import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const sql=fs.readFileSync("apps/fwkf-forum/migrations/0001_forum_schema.sql","utf8");
test("new posts and replies require review",()=>{assert.equal((sql.match(/status text NOT NULL DEFAULT 'pending'/g)||[]).length,2);});
test("forum remains isolated from existing WorldCafe/TWLF services",()=>{assert.ok(sql.includes("CREATE SCHEMA IF NOT EXISTS fwkf_forum"));assert.ok(!/\b(public|twlf|worldcafe)\./i.test(sql));});
test("no destructive statements or anonymous grants",()=>{assert.ok(!/DROP\s+(TABLE|SCHEMA)|GRANT\s+(ALL|SELECT|INSERT)/i.test(sql));assert.ok(sql.includes("REVOKE ALL ON ALL TABLES"));});
