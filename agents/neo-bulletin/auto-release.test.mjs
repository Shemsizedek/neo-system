import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  buildAutomatedPublicationReceipt, persistPublicationReceipt,
  recordAndQueueAutomatedPublication, fetchPublishedForReceipt
} from "./auto-release.mjs";

const at = new Date("2026-11-11T23:30:00Z");
const rendered = "<p>" + "Civic education. ".repeat(30) + "</p>";
const digest = createHash("sha256").update(rendered).digest("hex");
const post = {
  id:3868, slug:"neo-bulletin-2026-11-11-wednesday",
  status:"publish", categories:[778243565],
  link:"https://holytemples.org/2026/11/11/neo-bulletin-2026-11-11-wednesday/",
  content:{rendered}, title:{rendered:"Civics 101 + Economics"},
  meta:{
    _jetpack_dont_email_post_to_subs:true,
    jetpack_publicize_feature_enabled:false,
    _beehiiv_send_to_newsletter:false
  }
};
const checks = {
  independentSources:true,claimsVerified:true,counterEvidenceReviewed:true,
  riskScreenPassed:true,editorialQualityPassed:true,correctionsPresent:true,
  duplicateCheckPassed:true,draftReadbackMatched:true,liveReadbackMatched:true
};
const review = {
  postId:3868,approvalType:"AUTOMATED_ROUTINE_CONTENT",riskType:"education",
  manualReviewRequired:false,hasSensitiveAllegations:false,
  localDate:"2026-11-11",localWeekday:"wednesday",contentSha256:digest,
  checks,sources:[
    {url:"https://www.archives.gov/founding-docs/constitution-transcript",
      title:"Constitution transcript", supportingEvidence:"Article I appropriations rule",verifiedAt:at.toISOString()},
    {url:"https://www.gao.gov/federal-budgeting",
      title:"GAO Federal Budgeting",supportingEvidence:"Mandatory and discretionary spending distinction",verifiedAt:at.toISOString()}
  ]
};
test("verified routine publication yields deterministic receipt without dispatch",()=>{
  const receipt=buildAutomatedPublicationReceipt(post,review,at);
  assert.equal(receipt.id,"publication-3868-"+digest.slice(0,16));
  assert.equal(receipt.delivery.subscriberEmailOptOut,true);
  assert.equal(receipt.distributionStatus,"pending_editorial_marketing_review");
});
test("fail closed on sensitive, unverified, incomplete or edited material",()=>{
  for(const invalid of [
    {...review,riskType:"legal"},
    {...review,manualReviewRequired:true},
    {...review,hasSensitiveAllegations:true},
    {...review,checks:{...checks,claimsVerified:false}},
    {...review,contentSha256:"0".repeat(64)},
    {...review,sources:[review.sources[0]]},
    {...review,sources:[review.sources[0],{...review.sources[0],url:"https://www.archives.gov/other"}]},
    {...review,sources:[{...review.sources[0],verifiedAt:"2026-10-01T00:00:00Z"},review.sources[1]]}
  ]) assert.throws(()=>buildAutomatedPublicationReceipt(post,invalid,at));
  assert.throws(()=>buildAutomatedPublicationReceipt({...post,status:"draft"},review,at));
  assert.throws(()=>buildAutomatedPublicationReceipt({...post,content:{rendered:rendered+"changed"}},review,at));
  assert.throws(()=>buildAutomatedPublicationReceipt({...post,meta:{...post.meta,_jetpack_dont_email_post_to_subs:false}},review,at));
});
test("receipt insert is parameterized and idempotent",async()=>{
  const receipt=buildAutomatedPublicationReceipt(post,review,at);
  let digestFromInsert;
  const pool={query:async(sql,args)=>{
    if(sql.startsWith("INSERT")) {digestFromInsert=args[4];return {rows:[]};}
    return {rows:[{receipt_sha256:digestFromInsert}]};
  }};
  assert.equal((await persistPublicationReceipt(receipt,pool)).status,"already_recorded");
  const duplicate={...receipt,title:"altered headline"};
  await assert.rejects(()=>persistPublicationReceipt(duplicate,pool),/publication_receipt_conflict/);
});
test("records receipt, then queues marketing review only, no social distribution",async()=>{
  const queries=[];
  const pool={query:async(sql,args)=>{
    queries.push({sql,args});
    return {rows:[{id:args[0]}]};
  }};
  const result=await recordAndQueueAutomatedPublication(post,review,{pool,at});
  assert.equal(result.receipt.status,"recorded");
  assert.equal(result.marketer.status,"queued");
  assert.equal(result.marketer.distribution,"not_sent");
  assert.equal(queries.length,2);
  const marketer=JSON.parse(queries[1].args[1]);
  assert.equal(marketer.approvalType,"AUTOMATED_ROUTINE_CONTENT");
  assert.equal(marketer.approvedBy,null);
  assert.equal(marketer.autoPublishSocial,false);
  assert.equal(marketer.distributionStatus,"pending_editorial_marketing_review");
});
test("authenticated WordPress readback is required",async()=>{
  await assert.rejects(()=>fetchPublishedForReceipt(3868,{username:"",appPassword:""}),/credentials_missing/);
  const res=await fetchPublishedForReceipt(3868,{username:"editor",appPassword:"mock-pass",
    fetcher:async(url,options)=>{
      assert.match(url,/context=edit/);
      assert.match(options.headers.authorization,/^Basic /);
      return new Response(JSON.stringify(post),{status:200});
    }});
  assert.equal(res.id,3868);
});
