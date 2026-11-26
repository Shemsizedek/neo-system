#!/usr/bin/env node
/**
 * NEO-GITBOOK-002: small, dependency-free preflight for public GitBook source.
 * This checks only docs/gitbook-public; it is NOT a repository-wide secret audit.
 */
import { readdir, readFile, lstat } from "node:fs/promises";
import path from "node:path";

const root = path.resolve("docs/gitbook-public");
const failures = [];
const entries = (await readdir(root)).sort();
const markdown = entries.filter((name) => name.endsWith(".md"));
const expected = ["README.md", "SUMMARY.md"];
for (const name of expected) {
  if (!markdown.includes(name)) failures.push("Missing required " + name);
}
for (const name of entries) {
  const absolute = path.join(root, name);
  const stat = await lstat(absolute);
  if (!stat.isFile() || stat.isSymbolicLink() || !name.endsWith(".md")) {
    failures.push("Unexpected entry (expected flat Markdown file): " + name);
  }
}
const fileSet = new Set(markdown);
const contents = {};
for (const name of markdown) {
  const text = await readFile(path.join(root, name), "utf8");
  contents[name] = text;
  if (!/^#\s+\S/m.test(text)) failures.push(name + ": missing Markdown heading");
  const patterns = [
    [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, "AWS access key"],
    [/\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g, "GitHub token"],
    [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, "private key block"],
    [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "email address"],
    [/\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["']?[A-Za-z0-9_+./=-]{12,}/gi, "credential assignment"],
  ];
  for (const [regex, category] of patterns) {
    if (regex.test(text)) failures.push(name + ": potential " + category + "; review required");
  }
  for (const match of text.matchAll(/\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g)) {
    const href = match[1];
    if (/^https?:\/\//i.test(href)) {
      if (/^https?:\/\/(?:localhost|127\.|10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/i.test(href)) {
        failures.push(name + ": private-network link " + href);
      }
      continue;
    }
    if (href.startsWith("#") || /^(?:mailto:|tel:)/i.test(href)) continue;
    const clean = decodeURIComponent(href.split(/[?#]/)[0]);
    // First version deliberately accepts flat Markdown only; expand after review.
    if (clean.includes("/") || clean.startsWith(".") || !fileSet.has(clean)) {
      failures.push(name + ": invalid or missing relative link " + href);
    }
  }
}
const summary = contents["SUMMARY.md"] || "";
const nav = [...summary.matchAll(/^\s*\*\s+\[[^\]]+\]\(([^)]+)\)\s*$/gm)].map((m) => m[1]);
for (const name of markdown.filter((n) => n !== "SUMMARY.md")) {
  if (!nav.includes(name)) failures.push("SUMMARY.md: not indexed " + name);
}
for (const entry of nav) {
  if (!fileSet.has(entry)) failures.push("SUMMARY.md: missing target " + entry);
}
if (!/FOUNDATION\s*\/\s*SANDBOX/i.test(contents["README.md"] || "")) {
  failures.push("README.md: missing foundation/sandbox software status warning");
}
if (failures.length) {
  console.error("NEO GitBook docs preflight FAILED:\n- " + failures.join("\n- "));
  process.exitCode = 1;
} else {
  console.log("NEO GitBook docs preflight PASS: " + (markdown.length - 1) + " navigable pages; local links and selected sensitive patterns reviewed.");
  console.log("NOTE: Run a separate security/privacy review before public publication.");
}
