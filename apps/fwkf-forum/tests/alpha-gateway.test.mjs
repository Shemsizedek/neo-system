import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import gateway from "../functions/alpha/index.mjs";
const issuer="https://alpha-auth.example.invalid/neondb/auth";
const jwksUrl=issuer+"/.well-known/jwks.json";
const jwtOrigin=new URL(issuer).origin;
const {publicKey,privateKey}=generateKeyPairSync("ed25519");
const jwk={...publicKey.export({format:"jwk"}),kid:"test-signing-key",alg:"EdDSA"};
const originalFetch=globalThis.fetch;
const env={NEON_AUTH_BASE_URL:process.env.NEON_AUTH_BASE_URL,NEON_AUTH_JWKS_URL:process.env.NEON_AUTH_JWKS_URL};
function jwt(override={}){
 const h=Buffer.from(JSON.stringify({alg:"EdDSA",kid:"test-signing-key"})).toString("base64url");
 const p=Buffer.from(JSON.stringify({iss:jwtOrigin,aud:jwtOrigin,sub:"fake-test-member-001",iat:Math.floor(Date.now()/1000)-10,exp:Math.floor(Date.now()/1000)+120,...override})).toString("base64url");
 return h+"."+p+"."+sign(null,Buffer.from(h+"."+p),privateKey).toString("base64url");
}
const req=(path="/health",opts={})=>new Request("https://forum-staging.test"+path,opts);
test.before(()=>{
 process.env.NEON_AUTH_BASE_URL=issuer;process.env.NEON_AUTH_JWKS_URL=jwksUrl;
 globalThis.fetch=async (url)=>{assert.equal(url,jwksUrl);return new Response(JSON.stringify({keys:[jwk]}),{status:200,headers:{"content-type":"application/json"}})};
});
test.after(()=>{
 globalThis.fetch=originalFetch;
 for(const k of Object.keys(env)){if(env[k]===undefined)delete process.env[k];else process.env[k]=env[k]}
});
test("health explicitly reports read-only beta with registration and posting closed",async()=>{
 const r=await gateway.fetch(req());const b=await r.json();
 assert.equal(r.status,200);assert.equal(b.posting,false);assert.equal(b.registration,false);
 assert.equal(r.headers.get("cache-control"),"no-store");
});
test("anonymous member endpoint returns 401 and does not reveal information",async()=>{
 const r=await gateway.fetch(req("/me"));assert.equal(r.status,401);
 assert.deepEqual(await r.json(),{error:"AUTH_REQUIRED"});
});
test("valid signed Neon-style EdDSA bearer token is accepted without exposing member ID",async()=>{
 const r=await gateway.fetch(req("/me",{headers:{authorization:"Bearer "+jwt()}}));
 assert.equal(r.status,200);const b=await r.json();assert.equal(b.authenticated,true);
 assert.equal(b.posting,false);assert.equal(b.membership,"requires_invitation");
 assert.ok(!JSON.stringify(b).includes("fake-test-member"));
});
test("expired, wrong audience, wrong issuer and tampered signatures fail",async()=>{
 const candidates=[
 jwt({exp:1}),jwt({iss:"https://attacker.invalid"}),jwt({aud:"different-service"}),
 jwt({sub:"attacker"}).replace(/.$/,"A")
 ];
 for(const t of candidates){const r=await gateway.fetch(req("/me",{headers:{authorization:"Bearer "+t}}));assert.equal(r.status,401); }
});
test("no POST routes exist, regardless of authorization",async()=>{
 for(const path of ["/questions","/answers","/votes","/reports","/moderation","/me"]){
 const r=await gateway.fetch(req(path,{method:"POST",headers:{"content-type":"application/json",authorization:"Bearer "+jwt()},body:"{}"}));
 assert.equal(r.status,405,path);assert.deepEqual(await r.json(),{error:"POSTING_NOT_ENABLED"});
 }
});
test("foreign origins rejected and only known origin gets CORS",async()=>{
 let r=await gateway.fetch(req("/health",{headers:{origin:"https://evil.invalid"}}));assert.equal(r.status,403);
 assert.equal(r.headers.get("access-control-allow-origin"),null);
 r=await gateway.fetch(req("/health",{headers:{origin:"https://worldcafe.holytemples.org"}}));
 assert.equal(r.status,200);assert.equal(r.headers.get("access-control-allow-origin"),"https://worldcafe.holytemples.org");
 r=await gateway.fetch(req("/me",{method:"OPTIONS",headers:{origin:"https://worldcafe.holytemples.org"}}));
 assert.equal(r.status,204);assert.ok(r.headers.get("access-control-allow-headers").includes("Authorization"));
});
test("unknown routes are 404",async()=>{
 const r=await gateway.fetch(req("/private/admin"));assert.equal(r.status,404);
});
