import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EDITIONS, weekdayFor, safeUrl, createCandidate } from "./core.mjs";

const SITE = "https://holytemples.org";
const MAX_BYTES = 600_000;
function getTitle(html) {
  const value = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] || "";
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

export async function retrieveSource(url, { fetcher = fetch, at = new Date() } = {}) {
  if (!safeUrl(url)) throw new Error("source_url_not_allowlisted");
  const response = await fetcher(url, { method: "GET", signal: AbortSignal.timeout(15000), headers: { accept: "text/html" } });
  if (!response.ok) throw new Error("source_http_" + response.status);
  if (!safeUrl(response.url || url)) throw new Error("source_redirect_not_allowlisted");
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) throw new Error("source_not_html");
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength < 100 || buffer.byteLength > MAX_BYTES) throw new Error("source_size_out_of_range");
  const html = buffer.toString("utf8");
  const title = getTitle(html);
  if (!title) throw new Error("source_title_missing");
  return {
    ok: true, url, resolvedUrl: response.url || url, title,
    checkedAt: new Date(at).toISOString(),
    sha256: createHash("sha256").update(buffer).digest("hex"),
    bytes: buffer.byteLength,
    contentType
  };
}

// This endpoint is intentionally draft-only. There is no publish operation in this module.
export async function saveWordpressDraft(candidate, { fetcher = fetch, env = process.env } = {}) {
  const username = env.NEO_BULLETIN_WP_USERNAME;
  const password = env.NEO_BULLETIN_WP_APP_PASSWORD;
  if (!username || !password) return { status: "not_configured", reason: "missing_wordpress_app_credentials" };
  if (candidate.wordpressStatus !== "draft" || !candidate.reviewRequired) throw new Error("draft_only_guard");
  const authorization = "Basic " + Buffer.from(username + ":" + password).toString("base64");
  const headers = { authorization, accept: "application/json" };
  const root = SITE + "/wp-json/wp/v2/posts";
  const lookup = await fetcher(root + "?slug=" + encodeURIComponent(candidate.slug) + "&status=draft&context=edit",
    { headers, signal: AbortSignal.timeout(15000) });
  if (!lookup.ok) throw new Error("wordpress_lookup_http_" + lookup.status);
  const existing = await lookup.json();
  if (!Array.isArray(existing)) throw new Error("wordpress_lookup_invalid");
  if (existing.length) return { status: "existing_draft", postId: existing[0].id, link: existing[0].link };
  const payload = {
    title: candidate.title, slug: candidate.slug, content: candidate.content,
    status: "draft", categories: [778243565], comment_status: "closed"
  };
  const result = await fetcher(root, { method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify(payload), signal: AbortSignal.timeout(15000) });
  if (!result.ok) throw new Error("wordpress_create_http_" + result.status);
  const post = await result.json();
  if (post.status !== "draft" || !post.id) throw new Error("wordpress_unexpected_publication_state");
  return { status: "created_draft", postId: post.id, link: post.link || null };
}

export async function runAgent({
  at = new Date(), fetcher = fetch, env = process.env,
  outputDir = "artifacts/bulletin", persist = true
} = {}) {
  const day = weekdayFor(at, "America/Chicago");
  const plan = EDITIONS[day];
  if (!plan) throw new Error("missing_editorial_plan");
  const sourceResults = await Promise.allSettled(
    plan[4].map(url => retrieveSource(url, { fetcher, at }))
  );
  const evidence = sourceResults.filter(r => r.status === "fulfilled").map(r => r.value);
  const failures = sourceResults.flatMap((r, index) =>
    r.status === "rejected" ? [{ url: plan[4][index], error: String(r.reason?.message || r.reason) }] : []);
  // Fail closed rather than fabricating support from missing links.
  if (failures.length || evidence.length !== plan[4].length) {
    const error = new Error("source_verification_failed");
    error.details = failures;
    throw error;
  }
  const candidate = createCandidate({ at, evidence });
  const wordpress = await saveWordpressDraft(candidate, { fetcher, env });
  const receipt = {
    agent: "neo-bulletin", version: 1, status: "completed_draft_stage",
    executedAt: new Date(at).toISOString(), candidate,
    wordpress, socialHandoff: "disabled_until_review_and_publication",
    restrictions: ["no_publication", "no_auto_rebuttals", "no_personal_allegations"]
  };
  if (persist) {
    await mkdir(outputDir, { recursive: true });
    await writeFile(join(outputDir, candidate.slug + ".json"), JSON.stringify(receipt, null, 2));
    await writeFile(join(outputDir, candidate.slug + ".html"), candidate.content);
  }
  return receipt;
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  runAgent().then(result => {
    console.log(JSON.stringify({
      status: result.status, date: result.candidate.date,
      series: result.candidate.series, verifiedSources: result.candidate.evidence.length,
      wordpress: result.wordpress, socialHandoff: result.socialHandoff
    }));
  }).catch(error => {
    console.error(JSON.stringify({ status: "failed_closed", error: error.message, details: error.details || [] }));
    process.exitCode = 1;
  });
}
