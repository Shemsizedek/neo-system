import test from "node:test";
import assert from "node:assert/strict";
import { AUTHORIZED_COLLECTIONS, BOOK_COLLECTIONS, DISCOVERED_SOURCE_FILES, WORLD_LIBRARY_SOURCE_ROOT } from "./world-library-source-inventory.mjs";
import { libraryCatalogSearch, librarySourceVersions } from "./world-library-catalog.mjs";

test("authorized source root is configured for live production", () => {
  assert.equal(WORLD_LIBRARY_SOURCE_ROOT.mode, "live-production");
  assert.equal(AUTHORIZED_COLLECTIONS.length, 7);
  assert.ok(BOOK_COLLECTIONS.length >= 14);
});

test("verified recursive leaf scan remains GISD/GISS protected", () => {
  assert.equal(DISCOVERED_SOURCE_FILES.length, 11);
  const hits = libraryCatalogSearch("Millennium Book");
  assert.equal(hits.length, 2);
  assert.ok(hits.every((item) => item.status === "GISD_EXCLUSIVE"));
  assert.ok(hits.every((item) => item.accessClass === "GISD_EXCLUSIVE"));
  assert.ok(hits.every((item) => item.source === "google-drive"));
});

test("older duplicate editions are preserved as superseded source versions", () => {
  const versions = librarySourceVersions("The Luciferian Conspiracy");
  assert.equal(versions.length, 2);
  assert.equal(versions[0].modifiedAt, "2025-01-11");
  assert.equal(versions[1].modifiedAt, "2023-05-29T22:48:47.000Z");
  assert.equal(versions[1].status, "superseded");
});
