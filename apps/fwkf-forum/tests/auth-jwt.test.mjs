import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {createJwtVerifier} from "../src/auth-jwt.mjs";
const {privateKey,publicKey}=generateKeyPairSync("rsa",{modulusLength:2048});
const jwk={...publicKey.export({format:"jwk"}),kid:"test-key-1",alg:"RS256"};
const clock=()=>Date.parse("2026-11-01T12:00:00.000Z");
const verifier=createJwtVerifier({issuer:"https://auth.example.org",audience:"fwkf-forum",jwks:[jwk],clock});
function token(overrides={}){
 const h=Buffer.from(JSON.stringify({alg:"RS256",typ:"JWT",kid:"test-key-1"})).toString("base64url");
 const p=Buffer.from(JSON.stringify({iss:"https://auth.example.org",aud:"fwkf-forum",sub:"test-user-001",iat:Math.floor(clock()/1000),exp:Math.floor(clock()/1000)+300,...overrides})).toString("base64url");
 return h+"."+p+"."+sign("RSA-SHA256",Buffer.from(h+"."+p),privateKey).toString("base64url");
}
test("cryptographically valid token exposes subject, never caller-supplied roles",async()=>{
 assert.deepEqual(await verifier(token({role:"admin"})),{sub:"test-user-001"});
});
test("wrong issuer, audience or expired tokens rejected",async()=>{
 for(const o of [{iss:"https://evil.example"},{aud:"other-app"},{exp:Math.floor(clock()/1000)-1}])
 await assert.rejects(()=>verifier(token(o)),{code:"AUTH_REQUIRED"});
});
test("modified payload and malformed signature rejected",async()=>{
 const pieces=token().split(".");
 pieces[1]=Buffer.from(JSON.stringify({sub:"attacker",iss:"https://auth.example.org",aud:"fwkf-forum",exp:Math.floor(clock()/1000)+300})).toString("base64url");
 await assert.rejects(()=>verifier(pieces.join(".")),{code:"AUTH_REQUIRED"});
 await assert.rejects(()=>verifier("bad.token.signature"),{code:"AUTH_REQUIRED"});
});
test("refuses to start without trusted configured keys",()=>{
 assert.throws(()=>createJwtVerifier({issuer:"https://auth.example.org",audience:"fwkf-forum",jwks:[]}),/AUTH_PROVIDER_NOT_CONFIGURED/);
});
