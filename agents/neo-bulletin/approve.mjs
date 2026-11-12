import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { signEditorialApproval, BULLETIN_CATEGORY_ID } from "./release.mjs";

// Draft-first: human authorization is recorded BEFORE publishing, never inferred
// from an automated quality-control verdict. The same digest must survive
// publication or the downstream release worker refuses the Marketer handoff.
export async function fetchReviewableDraft(id, {
  fetcher = fetch,
  username = process.env.NEO_BULLETIN_WP_USERNAME,
  appPassword = process.env.NEO_BULLETIN_WP_APP_PASSWORD
} = {}) {
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("invalid_post_id");
  if (!username || !appPassword) throw new Error("wordpress_draft_credentials_missing");
  const target = "https://holytemples.org/wp-json/wp/v2/posts/" + id +
    "?context=edit&_fields=id,status,slug,link,title,categories,content";
  const response = await fetcher(target, {
    headers: {
      accept: "application/json",
      authorization: "Basic " + Buffer.from(username + ":" + appPassword).toString("base64")
    },
    redirect: "error",
    signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error("wordpress_draft_readback_http_" + response.status);
  return response.json();
}

export async function createSignedApproval(review, {
  secret = process.env.NEO_BULLETIN_REVIEW_SECRET,
  fetcher = fetch,
  username = process.env.NEO_BULLETIN_WP_USERNAME,
  appPassword = process.env.NEO_BULLETIN_WP_APP_PASSWORD,
  authorizedReviewers = (process.env.NEO_BULLETIN_AUTHORIZED_REVIEWERS || "").split(",").filter(Boolean),
  at = new Date()
} = {}) {
  if (!review || !Number.isSafeInteger(review.postId) || !Array.isArray(review.sourceUrls)) {
    throw new Error("invalid_review_submission");
  }
  if (review.evidenceReviewed !== true || review.fairReplyReviewed !== true ||
      review.humanReviewConfirmed !== true) throw new Error("editorial_checklist_incomplete");

  // A typed username is not proof of reviewer authority. An operator-provisioned
  // allowlist is required. Actual account authentication/audit is an external gate.
  if (!Array.isArray(authorizedReviewers) || !authorizedReviewers.includes(review.approvedBy) ||
      (review.secondReviewer && !authorizedReviewers.includes(review.secondReviewer))) {
    throw new Error("reviewer_identity_not_authorized");
  }
  const post = await fetchReviewableDraft(review.postId, { fetcher, username, appPassword });
  if (post.status !== "draft" || !post.categories?.includes(BULLETIN_CATEGORY_ID) ||
      !/^neo-bulletin-[0-9]{4}-[0-9]{2}-[0-9]{2}-(sunday|monday|tuesday|wednesday|thursday|friday|saturday)$/.test(post.slug)) {
    throw new Error("not_bulletin_draft");
  }
  const rendered = post.content?.rendered;
  if (typeof rendered !== "string" || !rendered.trim()) throw new Error("rendered_draft_missing");
  const entry = {
    postId: post.id,
    slug: post.slug,
    contentSha256: createHash("sha256").update(rendered).digest("hex"),
    type: review.type,
    approvedBy: review.approvedBy,
    secondReviewer: review.secondReviewer || null,
    approvedAt: new Date(at).toISOString(),
    sourceUrls: review.sourceUrls
  };
  return signEditorialApproval(entry, secret);
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  const [reviewPath, outputPath] = process.argv.slice(2);
  if (!reviewPath || !outputPath) {
    console.error("Usage: node agents/neo-bulletin/approve.mjs review.json approval.json");
    process.exitCode = 2;
  } else {
    readFile(reviewPath, "utf8").then(JSON.parse).then(review =>
      createSignedApproval(review)
    ).then(async approval => {
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, JSON.stringify(approval, null, 2), { flag: "wx", mode: 0o600 });
      console.log(JSON.stringify({ status: "draft_approval_created", postId: approval.postId, outputPath }));
    }).catch(error => {
      console.error(JSON.stringify({ status: "blocked", error: error.message }));
      process.exitCode = 1;
    });
  }
}
