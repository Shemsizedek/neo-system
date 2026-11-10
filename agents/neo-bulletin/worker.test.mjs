import test from "node:test";
import assert from "node:assert/strict";
import { EDITIONS, weekdayFor, localDay, safeUrl, createCandidate } from "./core.mjs";
import { retrieveSource, saveWordpressDraft, runAgent } from "./worker.mjs";

const when = new Date("2026-11-09T16:00:00Z");
const goodHtml = "<!doctype html><html><head><title>Official Reference</title></head><body>" + "source evidence ".repeat(15) + "</body></html>";
function sourceResponse(url, { status = 200, body = goodHtml, contentType = "text/html" } = {}) {
  return new Response(body, { status, headers: { "content-type": contentType } });
}
function fetchSource(input) {
  return Promise.resolve(Object.defineProperty(sourceResponse(input), "url", { value: input }));
}
function verified() {
  return EDITIONS.Monday[4].map((url, i) => ({
    url, ok: true, title: "Official " + i, sha256: "a".repeat(64),
    checkedAt: when.toISOString()
  }));
}

test("weekly plan and local date use Chicago", () => {
  assert.equal(weekdayFor(when), "Monday");
  assert.equal(localDay("2026-11-10T03:00:00Z"), "2026-11-09");
  assert.equal(Object.keys(EDITIONS).length, 7);
});
test("source URL restriction excludes impersonation, plaintext and embedded credentials", () => {
  assert.equal(safeUrl(EDITIONS.Monday[4][0]), true);
  assert.equal(safeUrl("http://www.archives.gov/"), false);
  assert.equal(safeUrl("https://www.archives.gov.evil.test/"), false);
  assert.equal(safeUrl("https://user:pass@www.archives.gov/"), false);
});
test("citation ledger required, and claims remain review-gated", () => {
  const c = createCandidate({ at: when, evidence: verified() });
  assert.match(c.content, /Evidence ledger/);
  assert.equal(c.wordpressStatus, "draft");
  assert.equal(c.marketingStatus, "blocked");
  assert.equal(c.approvalStatus, "pending");
  assert.throws(() => createCandidate({ at: when, evidence: verified().slice(0, 1) }), /two_sources_required/);
  assert.throws(() => createCandidate({ at: when, evidence: [{...verified()[0], url: "https://evil.test"} , verified()[1]] }), /unverified_source/);
});
test("retrieval fingerprints actual response bytes", async () => {
  const result = await retrieveSource(EDITIONS.Monday[4][0], { fetcher: fetchSource, at: when });
  assert.equal(result.sha256.length, 64);
  assert.equal(result.ok, true);
  assert.equal(result.title, "Official Reference");
  assert.ok(result.bytes > 100);
});
test("redirect to unapproved host fails closed", async () => {
  await assert.rejects(() => retrieveSource(EDITIONS.Monday[4][0], {fetcher: async () =>
    Object.defineProperty(sourceResponse("https://evil.test/"), "url", {value: "https://evil.test/"})
  }), /source_redirect_not_allowlisted/);
});
test("missing publishing credentials never sends a write", async () => {
  const result = await saveWordpressDraft(createCandidate({ at: when, evidence: verified() }),
    { env: {}, fetcher: () => { throw Error("unexpected_fetch"); } });
  assert.equal(result.status, "not_configured");
});
test("configured WordPress adapter posts draft only and honors existing drafts", async () => {
  const c = createCandidate({ at: when, evidence: verified() });
  const env = { NEO_BULLETIN_WP_USERNAME: "editor", NEO_BULLETIN_WP_APP_PASSWORD: "fake-test-password" };
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({url, options});
    if (!options.method) return new Response("[]", {status: 200, headers: {"content-type":"application/json"}});
    return new Response(JSON.stringify({id: 47, status: "draft", link: "https://holytemples.org/?p=47"}),
      {status: 201, headers: {"content-type":"application/json"}});
  };
  const result = await saveWordpressDraft(c, {env, fetcher});
  assert.equal(result.status, "created_draft");
  assert.equal(calls.length, 2);
  assert.equal(JSON.parse(calls[1].options.body).status, "draft");
  assert.equal(JSON.parse(calls[1].options.body).categories[0], 778243565);
  const existing = await saveWordpressDraft(c, {env, fetcher: async () =>
    new Response(JSON.stringify([{id: 47, status: "draft", link: "https://holytemples.org/?p=47"}]),
      {status: 200, headers: {"content-type":"application/json"}})});
  assert.equal(existing.status, "existing_draft");
});
test("one unreachable source blocks the entire worker", async () => {
  const fetcher = async url => {
    if (url.includes("consumerfinance")) throw Error("network_offline");
    return fetchSource(url);
  };
  await assert.rejects(() => runAgent({ at: when, fetcher, env: {}, persist: false }),
    /source_verification_failed/);
});
test("worker produces a draft-only receipt with two verified references", async () => {
  const receipt = await runAgent({ at: when, fetcher: fetchSource, env: {}, persist: false });
  assert.equal(receipt.status, "completed_draft_stage");
  assert.equal(receipt.wordpress.status, "not_configured");
  assert.equal(receipt.candidate.evidence.length, 2);
  assert.equal(receipt.socialHandoff, "disabled_until_review_and_publication");
});
