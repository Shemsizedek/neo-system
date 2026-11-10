import test from "node:test";
import assert from "node:assert/strict";
import {createSignedApproval} from "./approve.mjs";
import {checkEditorialApproval} from "./release.mjs";

const at=new Date("2026-11-10T18:00:00Z");
const secret="x".repeat(40);
const post={
  id:3861,slug:"neo-bulletin-2026-11-10-tuesday",status:"publish",
  categories:[778243565],title:{rendered:"Legal Tuesday"},
  link:"https://holytemples.org/2026/11/10/neo-bulletin-2026-11-10-tuesday/",
  content:{rendered:"<p>Test reviewed content</p>"}
};
const review={
  postId:3861,type:"education",approvedBy:"reviewer-1",
  sourceUrls:["https://www.archives.gov/founding-docs/bill-of-rights-transcript","https://www.uscourts.gov/about-federal-courts"],
  evidenceReviewed:true,fairReplyReviewed:true
};
function fetcher(result=post){return async()=>new Response(JSON.stringify(result),{status:200,headers:{"content-type":"application/json"}});}
test("editorial CLI creates a signed approval for actual published post",async()=>{
 const signature=await createSignedApproval(review,{secret,fetcher:fetcher(),at});
 assert.equal(signature.postId,3861);
 assert.equal(signature.signature.length,64);
 assert.equal(checkEditorialApproval(signature,post,secret,at).title,"Legal Tuesday");
});
test("operator review checklist cannot be bypassed",async()=>{
 await assert.rejects(()=>createSignedApproval({...review,evidenceReviewed:false},{secret,fetcher:fetcher(),at}),/editorial_checklist_incomplete/);
 await assert.rejects(()=>createSignedApproval({...review,fairReplyReviewed:false},{secret,fetcher:fetcher(),at}),/editorial_checklist_incomplete/);
});
test("no signature can be issued for a private WordPress draft",async()=>{
 await assert.rejects(()=>createSignedApproval(review,{secret,fetcher:fetcher({...post,status:"draft"}),at}),/not_bulletin_publication/);
});
test("reviewer key must be configured",async()=>{
 await assert.rejects(()=>createSignedApproval(review,{secret:"",fetcher:fetcher(),at}),/reviewer_secret_not_configured/);
});
test("rebuttals require distinct second reviewer",async()=>{
 await assert.rejects(()=>createSignedApproval({...review,type:"rebuttal"},{secret,fetcher:fetcher(),at}),/independent_second_review_required/);
});
