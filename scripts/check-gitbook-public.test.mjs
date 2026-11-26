/**
 * Regression tests for NEO-GITBOOK-002 public docs guardrail.
 * Safe temporary fixtures only; never write to the real docs collection.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const guard = fileURLToPath(new URL("./check-gitbook-public.mjs", import.meta.url));
const clean = {
  "README.md": "# NEO System\n\nFOUNDATION / SANDBOX\n\n[Guide](guide.md)\n",
  "SUMMARY.md": "# Table of contents\n\n* [Home](README.md)\n* [Guide](guide.md)\n",
  "guide.md": "# Guide\n\nA reviewed, public introduction.\n",
};

async function validateFixture(transform = (x) => x) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "neo-gitbook-test-"));
  try {
    const folder = path.join(cwd, "docs", "gitbook-public");
    await mkdir(folder, { recursive: true });
    for (const [filename, content] of Object.entries(transform({ ...clean }))) {
      await writeFile(path.join(folder, filename), content, "utf8");
    }
    return spawnSync(process.execPath, [guard], { cwd, encoding: "utf8" });
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

test("accepts a curated, navigable collection", async () => {
  const r = await validateFixture();
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /preflight PASS/);
});
test("blocks references outside the allowlisted collection", async () => {
  const r = await validateFixture((f) => ({ ...f, "guide.md": "# Guide\n\n[Root](../SECURITY.md)\n" }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /invalid or missing relative link/);
});
test("blocks dangling local links", async () => {
  const r = await validateFixture((f) => ({ ...f, "guide.md": "# Guide\n\n[Missing](not-here.md)\n" }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /invalid or missing relative link/);
});
test("blocks representative token pattern", async () => {
  const r = await validateFixture((f) => ({ ...f, "guide.md": "# Guide\n\nAPI key = ghp_abcdefghijklmnopqrstuvwxyz123456\n" }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /GitHub token/);
});
test("blocks mail addresses pending privacy review", async () => {
  const r = await validateFixture((f) => ({ ...f, "guide.md": "# Guide\n\nContact: person@example.com\n" }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /email address/);
});
test("requires an indexed page", async () => {
  const r = await validateFixture((f) => ({ ...f, "unlisted.md": "# Unlisted\n" }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /not indexed/);
});
test("requires foundation/sandbox release disclaimer", async () => {
  const r = await validateFixture((f) => ({ ...f, "README.md": "# NEO System\n\n[Guide](guide.md)\n" }));
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /foundation\/sandbox/);
});
