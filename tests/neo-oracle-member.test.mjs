import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../public/urim-wa-thummim/index.html", import.meta.url), "utf8");
const js = readFileSync(new URL("../public/urim-wa-thummim/member.js", import.meta.url), "utf8");

test("Temple Adept consultation features retain the original casting controls", () => {
  for (const id of ["cast", "journal", "issue", "context", "spread", "intent",
    "extendedGuidance", "previewGuidance", "guidanceOutput", "journalPass",
    "saveEncrypted", "unlockJournal", "exportEncrypted", "eraseEncrypted", "privateEntries", "journalStatus"]) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /<script src="\.\/member\.js" defer><\/script>/);
  assert.match(html, /The Oracle is the Temple Adept/);
});

test("Private journal uses authenticated encryption, per-save random values, and opt-in persistence", () => {
  assert.match(js, /PBKDF2/);
  assert.match(js, /iterations: 250000/);
  assert.match(js, /AES-GCM/);
  assert.match(js, /crypto\.getRandomValues\(new Uint8Array\(16\)\)/);
  assert.match(js, /crypto\.getRandomValues\(new Uint8Array\(12\)\)/);
  assert.match(js, /localStorage\.setItem\(KEY/);
  assert.match(js, /confirm\("Permanently erase/);
  assert.doesNotMatch(js, /\bfetch\s*\(/);
  assert.doesNotMatch(js, /\bXMLHttpRequest\b/);
  assert.doesNotMatch(js, /localStorage\.setItem\(KEY,\s*JSON\.stringify\(current\)/);
});

test("No paid checkout or entitlement is represented as active", () => {
  assert.match(js, /Premium consultation preview only/);
  assert.match(js, /No checkout, billing, or paid membership activation/);
  assert.doesNotMatch(html, /<form[^>]*action=[^>]*checkout/i);
});
