import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createSignedApproval } from "./approve.mjs";
import { checkEditorialApproval } from "./release.mjs";

const at = new Date("2026-11-10T18:00:00Z");
const secret = "x".repeat(40);
const post = {
  id: 3861,
  slug: "neo-bulletin-2026-11-10-tuesday",
  status: "draft",
  categories: [778243565],
  title: {rendered:"Legal Tuesday"},
  link:"https://holytemples.org/?p=3861",
  content:{rendered:"<p>Reviewed draft content</p>"}
};
const review = {
  postId:3861, type:"education", approvedBy:"reviewer-1",
  sourceUrls:[
    "https://www.archives.gov/founding-docs/bill-of-rights-transcript",
    "https://www.uscourts.gov/about-federal-courts"
  ],
  evidenceReviewed:true, fairReplyReviewed:true, humanReviewConfirmed:true
};
function fetcher(result = post) {
  return async (url, options) => {
    assert.match(url, /context=edit/);
    assert.match(options.headers.authorization, /^Basic /);
    return new Response(JSON.stringify(result), {status:200,headers:{"content-type":"application/json"}});
  };
}
const env = {secret,username:"editor",appPassword:"test-password",authorizedReviewers:["reviewer-1","reviewer-2"],at};
test("human-reviewed WordPress draft can be signed before publication",async()=>{
  const approval = await createSignedApproval(review,{...env,fetcher:fetcher()});
  assert.equal(approval.postId,3861);
  assert.equal(approval.signature.length,64);
  const published = {
    ...post,
    status:"publish",
    link:"https://holytemples.org/2026/11/10/neo-bulletin-2026-11-10-tuesday/"
  };
  assert.equal(checkEditorialApproval(approval,published,secret,at).contentSha256,
    createHash("sha256").update(post.content.rendered).digest("hex"));
});
test("automated clearance is not human approval",async()=>{
  await assert.rejects(()=>createSignedApproval({...review,humanReviewConfirmed:false},{...env,fetcher:fetcher()}),/editorial_checklist_incomplete/);
  await assert.rejects(()=>createSignedApproval({...review,evidenceReviewed:false},{...env,fetcher:fetcher()}),/editorial_checklist_incomplete/);
  await assert.rejects(()=>createSignedApproval({...review,fairReplyReviewed:false},{...env,fetcher:fetcher()}),/editorial_checklist_incomplete/);
});
test("published or incorrectly categorized post cannot receive a draft approval",async()=>{
  await assert.rejects(()=>createSignedApproval(review,{...env,fetcher:fetcher({...post,status:"publish"})}),/not_bulletin_draft/);
  await assert.rejects(()=>createSignedApproval(review,{...env,fetcher:fetcher({...post,categories:[]})}),/not_bulletin_draft/);
});
test("unverified WordPress access or reviewer authority fails closed",async()=>{
  await assert.rejects(()=>createSignedApproval(review,{...env,username:"",fetcher:fetcher()}),/wordpress_draft_credentials_missing/);
  await assert.rejects(()=>createSignedApproval(review,{...env,authorizedReviewers:[],fetcher:fetcher()}),/reviewer_identity_not_authorized/);
  await assert.rejects(()=>createSignedApproval(review,{...env,secret:"",fetcher:fetcher()}),/reviewer_secret_not_configured/);
});
test("legal and rebuttal reviews require a distinct authorized second reviewer",async()=>{
  await assert.rejects(()=>createSignedApproval({...review,type:"rebuttal"},{...env,fetcher:fetcher()}),/independent_second_review_required/);
  await assert.rejects(()=>createSignedApproval({...review,type:"legal",secondReviewer:"outsider"},{...env,fetcher:fetcher()}),/reviewer_identity_not_authorized/);
  const signed = await createSignedApproval({...review,type:"rebuttal",secondReviewer:"reviewer-2"},{...env,fetcher:fetcher()});
  assert.equal(signed.secondReviewer,"reviewer-2");
});
test("published text mutation invalidates the draft signature",async()=>{
  const signed = await createSignedApproval(review,{...env,fetcher:fetcher()});
  assert.throws(()=>checkEditorialApproval(signed,{
    ...post,status:"publish",link:"https://holytemples.org/2026/11/10/neo-bulletin-2026-11-10-tuesday/",
    content:{rendered:"<p>Changed</p>"}
  },secret,at),/published_content_changed_after_approval/);
});
