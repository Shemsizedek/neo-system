import test from "node:test";
import assert from "node:assert/strict";
import {
  RESOURCE_TYPES,
  canonicalResource,
  libraryCatalogList,
  libraryCatalogSearch,
  libraryResourceGet,
  libraryResourceMedia,
  libraryResourceCover,
  libraryDegreeResources,
  preferLatest,
  WORLD_LIBRARY_OPERATIONS,
} from "./world-library-catalog.mjs";

test("supports required resource types and canonical model", () => {
  assert.deepEqual(RESOURCE_TYPES, ["book", "audiobook", "audio", "document", "course material", "archive material"]);
  const r = canonicalResource({ id: "x", title: "X", resourceType: "audio" });
  for (const key of ["id","title","author","resourceType","description","coverImage","source","sourceId","sourceUrl","mediaUrl","mimeType","edition","modifiedAt","accessClass","degreeMapping","status"]) assert.ok(key in r);
  assert.ok(Object.isFrozen(r));
});

test("catalog operations are read-only and searchable", () => {
  const list = libraryCatalogList();
  assert.ok(list.length >= 8);
  assert.ok(Object.isFrozen(list));
  assert.ok(libraryCatalogSearch("Ethiopian").some((r) => r.id === "world-library-neo-codex"));
  assert.equal(libraryResourceGet("world-library-neo-codex")?.resourceType, "book");
  assert.equal(libraryResourceMedia("world-library-neo-codex")?.source, "google-drive");
  assert.deepEqual(libraryResourceCover("missing"), null);
  assert.deepEqual(libraryDegreeResources("unmapped"), []);
});

test("newest duplicate becomes canonical while older editions are preserved", () => {
  const result = preferLatest([
    { id: "old", title: "Same Work", resourceType: "book", modifiedAt: "2024-01-01", edition: "1" },
    { id: "new", title: "Same Work", resourceType: "book", modifiedAt: "2026-01-01", edition: "2" },
  ]);
  assert.equal(result.latest[0].id, "new");
  assert.deepEqual(result.sourceVersions["same work"].map((r) => r.id), ["new", "old"]);
});

test("operation namespace exposes exactly the requested read operations", () => {
  assert.deepEqual(Object.keys(WORLD_LIBRARY_OPERATIONS).sort(), [
    "library.catalog.list", "library.catalog.search", "library.degree.resources",
    "library.resource.cover", "library.resource.get", "library.resource.media",
  ].sort());
});
