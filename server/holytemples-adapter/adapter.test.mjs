import test from "node:test";
import assert from "node:assert/strict";
import {
  assertReadOnly,
  classifyLibraryRecord,
  health,
  libraryAsset,
  libraryCatalog,
  mutate,
  storeCatalog,
} from "./adapter.mjs";

test("health contract is explicitly read-only", () => {
  assert.deepEqual(health(), {
    ok: true,
    service: "holytemples-adapter",
    mode: "read-only",
    mutations: false,
    namespaces: ["library", "store"],
  });
  assert.equal(assertReadOnly(), true);
});

test("library supports the canonical exposure statuses", () => {
  for (const status of ["PUBLIC_WORLD_LIBRARY", "GISD_EXCLUSIVE", "DUPLICATE", "REVIEW"]) {
    assert.equal(classifyLibraryRecord({ title: "Example", status }).status, status);
  }
  assert.throws(() => classifyLibraryRecord({ status: "PUBLIC" }), /invalid library status/);
});

test("library catalog accepts records without mutating source data", () => {
  const source = [{ title: "Example", status: "REVIEW" }];
  const result = libraryCatalog(source);
  assert.notEqual(result[0], source[0]);
  assert.deepEqual(result, source);
});

test("library catalog defaults to the canonical read registry", () => {
  const result = libraryCatalog();
  assert.ok(result.length > 0);
  assert.ok(result.some((record) => record.assetId === "world-library-neo-codex"));
});

test("library asset reads canonical records by asset id", () => {
  const record = libraryAsset("world-library-neo-codex");
  assert.equal(record.driveFileId, "0B-oe5yNz2jy4VlVfTVJrNGFYczA");
  assert.equal(libraryAsset("missing"), null);
});

test("store exposes Spreadshop metadata only", () => {
  assert.deepEqual(storeCatalog(), {
    provider: "Spreadshop",
    shopName: "Shemsizedek",
    prefix: "https://Shemsizedek.myspreadshop.com",
  });
});

test("all mutation attempts fail closed", () => {
  assert.throws(() => mutate(), /read-only/);
});
