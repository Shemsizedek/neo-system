import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { persistBulletinPostgres, getBulletinPostgresPool } from "../../server/neo-marketer/bulletin-postgres.mjs";
import { BULLETIN_CATEGORY_ID } from "./release.mjs";

const sha = value => createHash("sha256").update(value).digest("hex");
const REQUIRED_CHECKS = [
  "independentSources", "claimsVerified", "counterEvidenceReviewed",
  "riskScreenPassed", "editorialQualityPassed", "correctionsPresent",
  "duplicateCheckPassed", "draftReadbackMatched", "liveReadbackMatched"
];
const LOCAL_SLUG = /^neo-bulletin-(\d{4}-\d{2}-\d{2})-(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/;

function safeUrl(value, hostname) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== hostname ||
      url.username || url.password || url.hash || url.port) throw new Error("invalid_publication_url");
  return url.toString();
}

export function buildAutomatedPublicationReceipt(post, review, at = new Date()) {
  if (!review || review.approvalType !== "AUTOMATED_ROUTINE_CONTENT" ||
      review.riskType !== "education" || review.manualReviewRequired !== false ||
      review.hasSensitiveAllegations !== false ||
      !review.checks || REQUIRED_CHECKS.some(key => review.checks[key] !== true)) {
    throw new Error("routine_editorial_gate_incomplete");
  }
  if (!post || !Number.isSafeInteger(post.id) || post.id <= 0 || post.status !== "publish" ||
      !Array.isArray(post.categories) || !post.categories.includes(BULLETIN_CATEGORY_ID)) {
    throw new Error("publication_readback_not_eligible");
  }
  const match = LOCAL_SLUG.exec(post.slug || "");
  if (!match || match[1] !== review.localDate || match[2] !== review.localWeekday) {
    throw new Error("publication_slug_date_mismatch");
  }
  const url = safeUrl(post.link, "holytemples.org");
  const rendered = post.content?.rendered;
  if (typeof rendered !== "string" || rendered.length < 350) throw new Error("publication_content_missing");
  const digest = sha(rendered);
  if (review.contentSha256 !== digest) throw new Error("content_changed_after_auto_approval");
  const m = post.meta || {};
  if (m._jetpack_dont_email_post_to_subs !== true ||
      m.jetpack_publicize_feature_enabled !== false ||
      m._beehiiv_send_to_newsletter !== false) throw new Error("newsletter_or_social_opt_out_unverified");
  const title = post.title?.rendered?.replace(/<[^>]+>/g, "").trim();
  if (!title || title.length > 240) throw new Error("publication_title_missing");
  if (!Array.isArray(review.sources) || review.sources.length < 2) throw new Error("independent_sources_missing");
  const hosts = new Set();
  for (const source of review.sources) {
    if (!source || typeof source.title !== "string" || source.title.trim().length < 5 ||
        typeof source.supportingEvidence !== "string" || !source.supportingEvidence.trim()) {
      throw new Error("source_evidence_incomplete");
    }
    const u = new URL(source.url);
    if (u.protocol !== "https:" || u.username || u.password || u.hash) throw new Error("source_url_invalid");
    const checked = Date.parse(source.verifiedAt);
    if (!Number.isFinite(checked) || checked > +at + 60_000 ||
        +at - checked > 7 * 86400_000) throw new Error("source_verification_stale");
    hosts.add(u.hostname);
  }
  if (hosts.size < 2) throw new Error("independent_source_hosts_missing");
  const id = "publication-" + post.id + "-" + digest.slice(0, 16);
  return {
    id, postId:post.id, slug:post.slug, url, title,
    localDate:review.localDate, localWeekday:review.localWeekday,
    contentSha256:digest, approvalType:"AUTOMATED_ROUTINE_CONTENT",
    riskType:"education", checkedAt:new Date(at).toISOString(),
    sources:review.sources, checks:review.checks,
    delivery:{wordpress:"publish",subscriberEmailOptOut:true,socialAutoShareOptOut:true},
    distributionStatus:"pending_editorial_marketing_review"
  };
}

export async function persistPublicationReceipt(receipt, pool) {
  if (!pool || typeof pool.query !== "function") throw new Error("publication_ledger_unavailable");
  const encoded = JSON.stringify(receipt);
  const digest = sha(encoded);
  const inserted = await pool.query(
    "INSERT INTO neo_bulletin.publication_receipts (id, post_id, content_sha256, receipt, receipt_sha256) " +
    "VALUES ($1, $2, $3, $4::jsonb, $5) ON CONFLICT (id) DO NOTHING RETURNING id",
    [receipt.id, receipt.postId, receipt.contentSha256, encoded, digest]
  );
  if (inserted.rows?.length === 1) return {status:"recorded",id:receipt.id};
  const existing = await pool.query(
    "SELECT receipt_sha256 FROM neo_bulletin.publication_receipts WHERE id = $1", [receipt.id]
  );
  if (existing.rows?.length !== 1) throw new Error("publication_ledger_write_unresolved");
  if (existing.rows[0].receipt_sha256 !== digest) throw new Error("publication_receipt_conflict");
  return {status:"already_recorded",id:receipt.id};
}

export async function recordAndQueueAutomatedPublication(post, review, {
  pool, at = new Date(), queueForMarketer = true
} = {}) {
  const receipt = buildAutomatedPublicationReceipt(post, review, at);
  const saved = await persistPublicationReceipt(receipt, pool);
  if (!queueForMarketer) return {receipt:saved, marketer:{status:"not_requested",distribution:"not_sent"}};
  // Marketer staging consumes this distinct machine-approval type only for
  // human marketing review. Never misrepresent it as a human-signed release.
  const payload = {
    type:"neo_bulletin_automated_routine_publication_v1",
    id:"neo-bulletin-" + post.id + "-" + receipt.contentSha256.slice(0,16),
    postId:post.id, slug:post.slug, title:receipt.title, url:receipt.url,
    contentSha256:receipt.contentSha256, issuedAt:receipt.checkedAt,
    approvedAt:receipt.checkedAt, approvalType:receipt.approvalType,
    approvedBy:null, riskType:"education", sourceUrls:review.sources.map(s=>s.url),
    publicationReceiptId:receipt.id,
    requestedAction:"queue_for_marketer_editorial_review",
    autoPublishSocial:false
  };
  const marketer = await persistBulletinPostgres(payload, pool);
  return {receipt:saved,marketer,publicationReceiptId:receipt.id};
}

export async function fetchPublishedForReceipt(postId, {
  username = process.env.NEO_BULLETIN_WP_USERNAME,
  appPassword = process.env.NEO_BULLETIN_WP_APP_PASSWORD,
  fetcher = fetch
} = {}) {
  if (!Number.isSafeInteger(postId) || postId <= 0) throw new Error("invalid_post_id");
  if (!username || !appPassword) throw new Error("wordpress_receipt_credentials_missing");
  const url = "https://holytemples.org/wp-json/wp/v2/posts/" + postId +
    "?context=edit&_fields=id,slug,status,link,categories,title,content,meta";
  const res = await fetcher(url, {
    redirect:"error", signal:AbortSignal.timeout(15000),
    headers:{accept:"application/json",
      authorization:"Basic " + Buffer.from(username + ":" + appPassword).toString("base64")}
  });
  if (!res.ok) throw new Error("wordpress_receipt_http_" + res.status);
  return res.json();
}

// Restricted, opt-in operator job; never invoked by the public request handler.
// Usage: node agents/neo-bulletin/auto-release.mjs private/approved-routine-review.json
if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  const reviewPath=process.argv[2];
  if (!reviewPath) {
    console.error("Usage: node agents/neo-bulletin/auto-release.mjs review.json");
    process.exitCode=2;
  } else {
    try {
      const review=JSON.parse(await readFile(reviewPath,"utf8"));
      const post=await fetchPublishedForReceipt(review.postId);
      const databaseUrl=process.env.NEO_BULLETIN_LEDGER_DB_URL;
      if (!databaseUrl) throw new Error("publication_ledger_url_not_configured");
      const pool=await getBulletinPostgresPool(databaseUrl);
      const result=await recordAndQueueAutomatedPublication(post,review,{pool});
      console.log(JSON.stringify(result));
    } catch(error) {
      console.error(JSON.stringify({status:"blocked",reason:error.message}));
      process.exitCode=1;
    }
  }
}
