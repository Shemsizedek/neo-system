import test from "node:test";
import assert from "node:assert/strict";
import {
  LIBRARY_STATUS,
  WORLD_LIBRARY_REGISTRY,
  readWorldLibrary,
  readWorldLibraryAsset,
} from "./library-registry.mjs";

test("registry exposes only canonical library statuses", () => {
  const allowed = new Set(Object.values(LIBRARY_STATUS));
  assert.ok(WORLD_LIBRARY_REGISTRY.length > 0);
  for (const record of WORLD_LIBRARY_REGISTRY) {
    assert.ok(allowed.has(record.status));
    assert.ok(record.assetId);
    assert.ok(record.canonicalTitle);
  }
});

test("verified public records have immutable Drive identifiers", () => {
  const publicRecords = readWorldLibrary({ status: LIBRARY_STATUS.PUBLIC });
  assert.ok(publicRecords.length >= 4);
  for (const record of publicRecords) {
    assert.ok(record.driveFileId);
    assert.match(record.driveUrl, /^https:\/\/drive\.google\.com\/file\/d\//);
    assert.equal(Object.isFrozen(record), true);
  }
});

test("unresolved public cards remain REVIEW and have no invented Drive mapping", () => {
  const reviewRecords = readWorldLibrary({ status: LIBRARY_STATUS.REVIEW });
  assert.ok(reviewRecords.length > 0);
  for (const record of reviewRecords) {
    assert.equal(record.driveFileId, null);
    assert.equal(record.driveUrl, null);
  }
});

test("asset reads are non-mutating copies", () => {
  const record = readWorldLibraryAsset("world-library-neo-codex");
  assert.equal(record.canonicalTitle, "The New Ethiopian Order Novus (NEO) Codex");
  assert.equal(record.driveFileId, "0B-oe5yNz2jy4VlVfTVJrNGFYczA");
  assert.equal(Object.isFrozen(record), true);
  assert.equal(readWorldLibraryAsset("missing"), null);
});
