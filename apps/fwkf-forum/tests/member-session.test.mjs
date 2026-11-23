import test from "node:test";
import assert from "node:assert/strict";
import {createForumSession} from "../web/member-session.mjs";
const API="https://br-misty-sun-b850yi7t-fwkfdata.compute.c-14.us-east-1.aws.neon.tech";
function fakeAuth(signed=true){
 const calls=[];let active=signed;
 return {calls,auth:{
  signIn:async(email,pw)=>{calls.push(["signIn",email]);active=true;},
  getSession:async()=>active?{session:{id:"opaque"}}:null,
  getAccessToken:async()=>{calls.push(["token"]);return "synthetic-signed-token-test-only";},
  signOut:async()=>{active=false;calls.push(["signOut"]);}
 }};
}
test("unconfigured or nonallowlisted test API fails closed",()=>{
 const a=fakeAuth().auth;
 assert.throws(()=>createForumSession({auth:a,apiBase:"https://evil.example"}),/STAGING_API_ALLOWLIST_FAILED/);
 assert.throws(()=>createForumSession({auth:a,apiBase:"http://br-test-fwkfdata.compute.neon.tech"}),/STAGING_API_ALLOWLIST_FAILED/);
});
test("signed-out member does not fetch protected endpoint",async()=>{
 const {auth}=fakeAuth(false);
 const s=createForumSession({auth,apiBase:API,fetcher:async()=>{throw Error("Unexpected fetch")}});
 assert.deepEqual(await s.getStatus(),{authenticated:false,reason:"SIGNED_OUT"});
});
test("signed-in session only uses memory JWT in allowlisted read-only GET",async()=>{
 const {auth,calls}=fakeAuth(false);let count=0;
 const s=createForumSession({auth,apiBase:API,fetcher:async(url,opts)=>{
  count++;assert.equal(url,API+"/me");assert.equal(opts.method,"GET");assert.equal(opts.redirect,"error");
  assert.equal(opts.headers.authorization,"Bearer synthetic-signed-token-test-only");
  return new Response(JSON.stringify({authenticated:true,posting:false,membership:"approved",role:"member"}),{status:200});
 }});
 const result=await s.signIn(" member@example.org ","longtestpassword");
 assert.deepEqual(result,{authenticated:true,posting:false,membership:"approved",role:"member"});
 assert.equal(count,1);assert.equal(calls[0][1],"member@example.org");
 assert.deepEqual(await s.signOut(),{authenticated:false,reason:"SIGNED_OUT"});
});
test("token refusal and server response errors do not grant membership",async()=>{
 const {auth}=fakeAuth(true);
 let s=createForumSession({auth,apiBase:API,fetcher:async()=>new Response("Unauthorized",{status:401})});
 assert.deepEqual(await s.getStatus(),{authenticated:false,reason:"TOKEN_REJECTED"});
 s=createForumSession({auth,apiBase:API,fetcher:async()=>new Response(JSON.stringify({authenticated:true,posting:true,membership:"requires_invitation"}),{status:200})});
 await assert.rejects(()=>s.getStatus(),/INVALID_API_RESPONSE/);
});

test("signed-in Neon identity without approved Forum membership is not admitted",async()=>{
 const {auth}=fakeAuth(true);
 const s=createForumSession({auth,apiBase:API,fetcher:async()=>new Response(JSON.stringify({error:"MEMBERSHIP_NOT_APPROVED"}),{status:403})});
 assert.deepEqual(await s.getStatus(),{authenticated:true,posting:false,membership:"pending_approval"});
});
test("unrelated access denials never masquerade as pending membership",async()=>{
 const {auth}=fakeAuth(true);
 const s=createForumSession({auth,apiBase:API,fetcher:async()=>new Response(JSON.stringify({error:"ORIGIN_DENIED"}),{status:403})});
 await assert.rejects(()=>s.getStatus(),/FORUM_MEMBERSHIP_UNAVAILABLE/);
});
