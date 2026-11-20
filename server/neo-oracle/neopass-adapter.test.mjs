import test from "node:test";
import assert from "node:assert/strict";
import { createOracleNeopassVerifier } from "./neopass-adapter.mjs";
import { issueNeopassToken } from "../neo-platform-api/neopass-google-auth.mjs";

const secret = "test-only-neopass-secret-that-is-at-least-32-characters";
const timestamp = 1_750_000_000_000;
const subject = "google:demo-member-123";
const now = () => timestamp;
const registry = {async getNEOpassCredential(id) {return { subject: id, status: "active", role: "member" }}};
const verify = () => createOracleNeopassVerifier({jwtSecret:secret,registry,now});
const token = (claims = {}, params = {}) => issueNeopassToken({
  subject, secret, now, ttlSeconds:300,
  claims: {scope:"neo:oracle:execute",token_use:"browser",...claims},...params
});

test("active NEOpass browser session is scoped to Oracle execution", async () => {
  assert.deepEqual(await verify()(token()), {
    verified:true,subject,audience:"neo-oracle",scopes:["oracle.execute"],expiresAtMs:timestamp+300_000
  });
});
test("unsigned, tampered and wrong purpose claims are denied", async () => {
  assert.equal(await verify()("forged-token"),null);
  assert.equal(await verify()(token().slice(0,-6)+"tamper"),null);
  assert.equal(await verify()(token({scope:"other:action"})),null);
  assert.equal(await verify()(token({token_use:"session"})),null);
  assert.equal(await verify()(token({}, {ttlSeconds:28800})),null);
});
test("unavailable, missing, or inactive member registry never grants access", async () => {
  const inactive=createOracleNeopassVerifier({jwtSecret:secret,registry:{async getNEOpassCredential(){return {subject,status:"disabled"}}},now});
  const missing=createOracleNeopassVerifier({jwtSecret:secret,registry:{async getNEOpassCredential(){return null}},now});
  const unavailable=createOracleNeopassVerifier({jwtSecret:secret,registry:{async getNEOpassCredential(){throw Error("down")}},now});
  assert.equal(await inactive(token()),null);
  assert.equal(await missing(token()),null);
  await assert.rejects(unavailable(token()),/down/);
});
test("incorrect key, expired token, or configuration failure are denied", async () => {
  assert.equal(await verify()(token({}, {secret:"wrong-signing-key-that-is-at-least-32-characters"})),null);
  assert.equal(await createOracleNeopassVerifier({jwtSecret:secret,registry,now:()=>timestamp+900_000})(token()),null);
  assert.throws(()=>createOracleNeopassVerifier({jwtSecret:"",registry,now}),/not_configured/);
});
