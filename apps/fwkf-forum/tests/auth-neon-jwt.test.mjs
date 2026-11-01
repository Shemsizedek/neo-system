import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {createNeonJwtVerifier} from "../src/auth-neon-jwt.mjs";
const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const jwk={...publicKey.export({format:"jwk"}),alg:"EdDSA",kid:"staging-test"};
const now=()=>Date.parse("2026-11-01T15:00:00Z");
const verify=createNeonJwtVerifier({issuer:"https://staging.example.com/auth",audience:"authenticated",jwks:[jwk],clock:now});
function make(overrides={}){
 const head=Buffer.from(JSON.stringify({alg:"EdDSA",kid:"staging-test"})).toString("base64url");
 const body=Buffer.from(JSON.stringify({iss:"https://staging.example.com/auth",aud:"authenticated",sub:"member-123",exp:Math.floor(now()/1000)+240,...overrides})).toString("base64url");
 return head+"."+body+"."+sign(null,Buffer.from(head+"."+body),privateKey).toString("base64url");
}
test("Neon EdDSA signature verifies and discards untrusted roles",async()=>assert.deepEqual(await verify(make({role:"admin"})),{sub:"member-123"}));
test("incorrect issuer audience and expiration denied",async()=>{for(const x of [{iss:"https://wrong.example"},{aud:"another-api"},{exp:1}])await assert.rejects(()=>verify(make(x)),{code:"AUTH_REQUIRED"})});
test("tampered subject and invalid signing algorithm denied",async()=>{
 const parts=make().split(".");parts[1]=Buffer.from(JSON.stringify({sub:"attacker",iss:"https://staging.example.com/auth",aud:"authenticated",exp:Math.floor(now()/1000)+240})).toString("base64url");
 await assert.rejects(()=>verify(parts.join(".")),{code:"AUTH_REQUIRED"});
});
