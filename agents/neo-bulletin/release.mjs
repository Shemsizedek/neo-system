import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const BULLETIN_CATEGORY_ID = 778243565;
const REVIEW_TYPES = new Set(["education", "doctrine", "historical", "rebuttal", "legal"]);
const sha = text => createHash("sha256").update(String(text)).digest("hex");
const canonical = record => JSON.stringify({
  postId: record.postId, slug: record.slug, contentSha256: record.contentSha256,
  approvedBy: record.approvedBy, secondReviewer: record.secondReviewer || null,
  approvedAt: record.approvedAt, type: record.type, sourceUrls: record.sourceUrls
});

function requireHttps(value, host) {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password || u.hash || (host && u.hostname !== host)) {
    throw new Error("untrusted_url");
  }
  return u;
}

function validReviewFields(record) {
  if (!record || !Number.isSafeInteger(record.postId) || record.postId <= 0 ||
    !/^neo-bulletin-[a-z0-9-]{5,100}$/.test(record.slug) ||
    !/^[0-9a-f]{64}$/.test(record.contentSha256) ||
    typeof record.approvedBy !== "string" || record.approvedBy.trim().length < 3 ||
    !REVIEW_TYPES.has(record.type) ||
    !Number.isFinite(Date.parse(record.approvedAt)) ||
    !Array.isArray(record.sourceUrls) || new Set(record.sourceUrls).size < 2) {
    throw new Error("incomplete_editorial_approval");
  }
  for (const url of record.sourceUrls) requireHttps(url);
  if (["legal", "rebuttal"].includes(record.type) &&
      (!record.secondReviewer || record.secondReviewer === record.approvedBy)) {
    throw new Error("independent_second_review_required");
  }
}

// Creating a signed approval is an explicit operator task. Never call from the scheduled draft worker.
export function signEditorialApproval(record, reviewerSecret) {
  validReviewFields(record);
  if (!reviewerSecret || reviewerSecret.length < 32) throw new Error("reviewer_secret_not_configured");
  return {
    ...record,
    secondReviewer: record.secondReviewer || null,
    signature: createHmac("sha256", reviewerSecret).update(canonical(record)).digest("hex")
  };
}

export function checkEditorialApproval(approval, post, reviewerSecret, now = new Date()) {
  if (!reviewerSecret || reviewerSecret.length < 32) throw new Error("reviewer_secret_not_configured");
  validReviewFields(approval);
  if (!/^[0-9a-f]{64}$/.test(approval.signature || "")) throw new Error("approval_signature_missing");
  const expected = createHmac("sha256", reviewerSecret).update(canonical(approval)).digest("hex");
  if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(approval.signature, "hex"))) {
    throw new Error("approval_signature_invalid");
  }
  const timestamp = Date.parse(approval.approvedAt), clock = new Date(now).getTime();
  if (timestamp > clock + 60_000 || clock - timestamp > 30 * 86400_000) {
    throw new Error("approval_expired_or_future");
  }
  if (!post || post.id !== approval.postId || post.slug !== approval.slug ||
      post.status !== "publish" || !post.categories?.includes(BULLETIN_CATEGORY_ID)) {
    throw new Error("wordpress_post_not_eligible");
  }
  const url = requireHttps(post.link, "holytemples.org");
  if (!["", "443"].includes(url.port)) throw new Error("untrusted_post_port");
  const rendered = post.content?.rendered;
  if (typeof rendered !== "string" || sha(rendered) !== approval.contentSha256) {
    throw new Error("published_content_changed_after_approval");
  }
  const title = post.title?.rendered?.replace(/<[^>]*>/g, "").trim();
  if (!title || title.length > 240) throw new Error("invalid_published_title");
  return { title, url: url.toString(), contentSha256: sha(rendered) };
}

export function makeMarketerHandoff(approval, post, reviewerSecret, at = new Date()) {
  const checked = checkEditorialApproval(approval, post, reviewerSecret, at);
  return {
    type: "neo_bulletin_reviewed_publication_v1",
    id: "neo-bulletin-" + post.id + "-" + checked.contentSha256.slice(0, 16),
    issuedAt: new Date(at).toISOString(),
    postId: post.id, slug: post.slug, title: checked.title, url: checked.url,
    contentSha256: checked.contentSha256,
    approvedAt: approval.approvedAt,
    approvedBy: approval.approvedBy,
    secondReviewer: approval.secondReviewer || null,
    riskType: approval.type,
    sourceUrls: approval.sourceUrls,
    requestedAction: "queue_reviewed_content_for_marketing",
    autoPublishSocial: false
  };
}

export async function fetchPublishedPost(id, fetcher = fetch) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("invalid_post_id");
  const target = "https://holytemples.org/wp-json/wp/v2/posts/" + id +
    "?_fields=id,status,slug,link,title,categories,content";
  const r = await fetcher(target, {
    signal: AbortSignal.timeout(15000), headers: { accept: "application/json" },
    redirect: "error"
  });
  if (!r.ok) throw new Error("wordpress_readback_http_" + r.status);
  return r.json();
}

export async function sendMarketerHandoff(payload, { fetcher = fetch, env = process.env, at = new Date() } = {}) {
  const endpoint = env.NEO_BULLETIN_MARKETER_ENDPOINT;
  const secret = env.NEO_BULLETIN_MARKETER_SHARED_SECRET;
  if (!endpoint || !secret || secret.length < 32) {
    return { status: "not_configured", reason: "marketer_endpoint_or_secret_missing" };
  }
  const u = requireHttps(endpoint, "marketer.holytemples.org");
  if (u.pathname !== "/api/marketer/bulletin-intake" || u.port) throw new Error("unexpected_marketer_endpoint");
  // Signed payload timestamp must correspond to the actual dispatch, not a stale prepared file.
  const request = { ...payload, issuedAt: new Date(at).toISOString() };
  const body = JSON.stringify(request);
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const response = await fetcher(endpoint, {
    method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
    headers: { "content-type": "application/json", "x-neo-bulletin-signature": "sha256=" + signature },
    body
  });
  if (!response.ok) throw new Error("marketer_intake_http_" + response.status);
  const result = await response.json();
  if (result.id !== payload.id || !["queued", "already_queued"].includes(result.status)) {
    throw new Error("unverified_marketer_receipt");
  }
  return { status: result.status, id: result.id, distribution: "not_sent" };
}

export async function prepareRelease({
  approval, at = new Date(), env = process.env, fetcher = fetch,
  outputDir = "artifacts/bulletin/release", send = false
}) {
  const post = await fetchPublishedPost(approval.postId, fetcher);
  const payload = makeMarketerHandoff(approval, post, env.NEO_BULLETIN_REVIEW_SECRET, at);
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, payload.id + ".json"), JSON.stringify(payload, null, 2));
  const marketer = send ? await sendMarketerHandoff(payload, {fetcher, env, at}) :
    {status: "prepared_only", distribution: "not_sent"};
  return { id: payload.id, postId: post.id, publishedVerified: true, marketer };
}

// CLI: node agents/neo-bulletin/release.mjs ./path/to/operator-signed-approval.json
// Explicit send is enabled only by NEO_BULLETIN_SEND_MARKETER=1, never by the draft workflow.
if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node agents/neo-bulletin/release.mjs approval.json");
    process.exitCode = 2;
  } else {
    readFile(file, "utf8").then(JSON.parse).then(approval =>
      prepareRelease({ approval, send: process.env.NEO_BULLETIN_SEND_MARKETER === "1" })
    ).then(r => console.log(JSON.stringify(r))).catch(e => {
      console.error(JSON.stringify({status: "blocked", reason: e.message}));
      process.exitCode = 1;
    });
  }
}
