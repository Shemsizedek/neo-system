import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyLibraryRecord,
  health,
  libraryAsset,
  libraryCatalog,
  searchPublicLibrary,
  storeCatalog,
} from "./adapter.mjs";

test("health contract reports live production Noogle service", () => {
  assert.deepEqual(health(), {
    ok: true,
    service: "holytemples-adapter",
    mode: "live-production",
    namespaces: ["library", "store", "noogle"],
  });
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

test("public catalog excludes GISD/GISS exclusive inventory", () => {
  const result = libraryCatalog();
  assert.ok(result.length > 0);
  assert.ok(result.every((record) => record.accessClass === "PUBLIC_WORLD_LIBRARY"));
  assert.ok(result.some((record) => record.id === "world-library-neo-codex"));
  assert.ok(!result.some((record) => record.accessClass === "GISD_EXCLUSIVE"));
});

test("public Noogle search preserves the public access boundary", () => {
  const result = searchPublicLibrary("NEO");
  assert.ok(result.every((record) => record.accessClass === "PUBLIC_WORLD_LIBRARY"));
});

test("library asset hides protected resources from anonymous reads", () => {
  const record = libraryAsset("world-library-neo-codex");
  assert.equal(record.sourceId, "0B-oe5yNz2jy4VlVfTVJrNGFYczA");
  assert.equal(libraryAsset("drive-1tt6Ea2VIsCaKd8ArCj29Ze8Tj81VTos3"), null);
  assert.equal(libraryAsset("missing"), null);
});

test("store exposes Spreadshop metadata only", () => {
  assert.deepEqual(storeCatalog(), {
    provider: "Spreadshop",
    shopName: "Shemsizedek",
    prefix: "https://Shemsizedek.myspreadshop.com",
  });
});
