import test from "node:test";
import assert from "node:assert/strict";
import {
  assertReadOnly,
  classifyLibraryRecord,
  health,
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
