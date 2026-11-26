import test from "node:test";
import assert from "node:assert/strict";
import { createHmac, createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  signEditorialApproval, checkEditorialApproval, makeMarketerHandoff,
  prepareRelease, sendMarketerHandoff
} from "./release.mjs";
import {
  validSignature, validateBulletinHandoff, persistBulletinHandoff, intakeBulletin
} from "../../server/neo-marketer/bulletin-intake.mjs";

const now = new Date("2026-11-10T15:00:00.000Z");
const reviewSecret = "r".repeat(40);
const handoffSecret = "m".repeat(40);
const content = "<p>Verified example content</p>";
const digest = createHash("sha256").update(content).digest("hex");
const sources = ["https://www.archives.gov/founding-docs/bill-of-rights-transcript", "https://www.uscourts.gov/about-federal-courts"];
const post = {
  id: 3861, slug: "neo-bulletin-2026-11-10-tuesday", status: "publish",
  categories: [778243565], link: "https://holytemples.org/2026/11/10/neo-bulletin-2026-11-10-tuesday/",
  content: {rendered: content}, title: {rendered: "Civics 101"}
};
const record = (type = "education") => ({
  postId: 3861, slug: post.slug, type,
  approvedBy: "editor-one", secondReviewer: ["legal", "rebuttal"].includes(type) ? "editor-two" : null,
  contentSha256: digest, approvedAt: "2026-11-10T14:59:00Z", sourceUrls: sources
});
function signed(type) {return signEditorialApproval(record(type), reviewSecret);}
function handoff(type = "education") {return makeMarketerHandoff(signed(type), post, reviewSecret, now);}
const mockWordpress = async () => new Response(JSON.stringify(post), {
  status: 200, headers: {"content-type": "application/json"}
});

test("editor approves a published, unchanged source-linked bulletin", () => {
  const approval = signed();
  assert.equal(checkEditorialApproval(approval, post, reviewSecret, now).contentSha256, digest);
  const payload = makeMarketerHandoff(approval, post, reviewSecret, now);
  assert.equal(payload.autoPublishSocial, false);
  assert.equal(payload.requestedAction, "queue_reviewed_content_for_marketing");
  assert.deepEqual(validateBulletinHandoff(payload, now), payload);
});
test("a draft, changed post, forged signature, or missing sources fails closed", () => {
  assert.throws(() => makeMarketerHandoff(signed(), {...post,status:"draft"}, reviewSecret, now), /wordpress_post_not_eligible/);
  assert.throws(() => makeMarketerHandoff(signed(), {...post,content:{rendered:content+"changed"}}, reviewSecret, now), /published_content_changed/);
  const fake={...signed(),approvedBy:"intruder"};
  assert.throws(() => makeMarketerHandoff(fake,post,reviewSecret,now), /approval_signature_invalid/);
  assert.throws(() => signEditorialApproval({...record(),sourceUrls:sources.slice(0,1)},reviewSecret),/incomplete_editorial_approval/);
});
test("legal and rebuttal releases require independent second reviewer", () => {
  assert.throws(()=>signEditorialApproval({...record("rebuttal"),secondReviewer:null},reviewSecret),/independent_second_review_required/);
  assert.doesNotThrow(()=>makeMarketerHandoff(signed("rebuttal"),post,reviewSecret,now));
});
test("release requires a matching authorized published WordPress readback", async () => {
  const dir=await mkdtemp(join(tmpdir(),"bulletin-rel-"));
  try {
    const result=await prepareRelease({approval:signed(),at:now,env:{NEO_BULLETIN_REVIEW_SECRET:reviewSecret},
      fetcher:mockWordpress,outputDir:dir,send:false});
    assert.equal(result.marketer.status,"prepared_only");
    assert.equal(result.publishedVerified,true);
    const file=JSON.parse(await readFile(join(dir,result.id+".json"),"utf8"));
    assert.equal(file.url,post.link);
    assert.equal(file.autoPublishSocial,false);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test("transport with missing secret cannot send", async () => {
  const r=await sendMarketerHandoff(handoff(),{env:{},fetcher:()=>{throw Error("must not fetch");}});
  assert.equal(r.status,"not_configured");
});
test("signed marketer handoff queued durably and deduplicated", async () => {
  const dir=await mkdtemp(join(tmpdir(),"bulletin-q-"));
  try {
    const p=handoff();
    assert.equal((await persistBulletinHandoff(p,dir)).status,"queued");
    assert.equal((await persistBulletinHandoff(p,dir)).status,"already_queued");
    const stored=JSON.parse(await readFile(join(dir,p.id+".json"),"utf8"));
    assert.equal(stored.distributionStatus,"pending_editorial_marketing_review");
    assert.equal(stored.autoPublishSocial,false);
    await assert.rejects(()=>persistBulletinHandoff({...p,title:"collision"},dir),/handoff_id_conflict/);
  } finally {await rm(dir,{recursive:true,force:true});}
});
test("rejects stale or altered handoffs and unsigned requests", async () => {
  const p=handoff();
  assert.throws(()=>validateBulletinHandoff({...p,issuedAt:"2026-11-09T00:00:00Z"},now),/timestamp_stale/);
  assert.throws(()=>validateBulletinHandoff({...p,url:"https://attacker.invalid/"},now),/invalid_publication_url/);
  assert.throws(()=>validateBulletinHandoff({...p,autoPublishSocial:true},now),/invalid_bulletin_payload/);
  const body=JSON.stringify(p);
  const sig="sha256="+createHmac("sha256",handoffSecret).update(body).digest("hex");
  assert.ok(validSignature(body,sig,handoffSecret));
  assert.equal(validSignature(body+" ",sig,handoffSecret),false);
});
test("HTTP intake authenticates, persists, and never sends social content", async () => {
  const dir=await mkdtemp(join(tmpdir(),"bulletin-http-"));
  const p=handoff(),body=JSON.stringify(p),signature="sha256="+createHmac("sha256",handoffSecret).update(body).digest("hex");
  function req(sig) {return {headers:{"x-neo-bulletin-signature":sig},async *[Symbol.asyncIterator](){yield Buffer.from(body);}};}
  function res(){return {status:null,headers:null,body:"",
    writeHead(s,h){this.status=s;this.headers=h;},end(b){this.body=b;}};}
  try {
    const unauth=res();
    await intakeBulletin(req("sha256="+"0".repeat(64)),unauth,{secret:handoffSecret,queueDir:dir,at:now});
    assert.equal(unauth.status,401);
    const first=res();
    await intakeBulletin(req(signature),first,{secret:handoffSecret,queueDir:dir,at:now});
    assert.equal(first.status,201);
    assert.equal(JSON.parse(first.body).status,"queued");
    const second=res();
    await intakeBulletin(req(signature),second,{secret:handoffSecret,queueDir:dir,at:now});
    assert.equal(second.status,200);
    assert.equal(JSON.parse(second.body).status,"already_queued");
  } finally {await rm(dir,{recursive:true,force:true});}
});
