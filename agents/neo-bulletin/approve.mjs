import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { fetchPublishedPost, signEditorialApproval, makeMarketerHandoff } from "./release.mjs";

export async function createSignedApproval(review, {
  secret = process.env.NEO_BULLETIN_REVIEW_SECRET,
  fetcher = fetch, at = new Date()
} = {}) {
  if (!review || !Number.isSafeInteger(review.postId) || !Array.isArray(review.sourceUrls)) {
    throw new Error("invalid_review_submission");
  }
  if (review.evidenceReviewed !== true || review.fairReplyReviewed !== true) {
    throw new Error("editorial_checklist_incomplete");
  }
  const post = await fetchPublishedPost(review.postId, fetcher);
  if (post.status !== "publish" || !post.categories?.includes(778243565) ||
    !/^neo-bulletin-[a-z0-9-]{5,100}$/.test(post.slug)) throw new Error("not_bulletin_publication");
  if (typeof post.content?.rendered !== "string" || !post.content.rendered.length) {
    throw new Error("rendered_article_missing");
  }
  const entry = {
    postId: post.id, slug: post.slug,
    contentSha256: createHash("sha256").update(post.content.rendered).digest("hex"),
    type: review.type, approvedBy: review.approvedBy,
    secondReviewer: review.secondReviewer || null,
    approvedAt: new Date(at).toISOString(),
    sourceUrls: review.sourceUrls
  };
  const approval = signEditorialApproval(entry, secret);
  // Recheck the WordPress readback against the freshly signed manifest.
  makeMarketerHandoff(approval, post, secret, at);
  return approval;
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
      await mkdir(dirname(outputPath), {recursive: true});
      await writeFile(outputPath, JSON.stringify(approval, null, 2), {flag: "wx", mode: 0o600});
      console.log(JSON.stringify({status:"approval_created",postId:approval.postId,outputPath}));
    }).catch(error => {
      console.error(JSON.stringify({status:"blocked",error:error.message}));
      process.exitCode = 1;
    });
  }
}
