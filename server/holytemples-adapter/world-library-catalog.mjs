import { WORLD_LIBRARY_REGISTRY } from "./library-registry.mjs";
import { DISCOVERED_SOURCE_FILES } from "./world-library-source-inventory.mjs";
import { WORLD_LIBRARY_PRODUCTION_BATCH_2 } from "./world-library-production-batch-2.mjs";
import { PRODUCTION_BATCH_3 } from "./world-library-production-batch-3.mjs";

export const RESOURCE_TYPES = Object.freeze([
  "book", "audiobook", "audio", "document", "course material", "archive material",
]);

const freeze = (value) => Object.freeze(value);
const cloneArray = (value = []) => freeze([...value]);

export function canonicalResource(input) {
  if (!input || typeof input !== "object") throw new TypeError("resource is required");
  const resourceType = input.resourceType ?? input.mediaType;
  if (!RESOURCE_TYPES.includes(resourceType)) throw new RangeError("invalid resourceType");
  return freeze({
    id: input.id ?? input.assetId,
    title: input.title ?? input.canonicalTitle,
    author: input.author ?? null,
    resourceType,
    description: input.description ?? null,
    coverImage: input.coverImage ?? null,
    source: input.source ?? (input.driveFileId ? "google-drive" : null),
    sourceId: input.sourceId ?? input.driveFileId ?? null,
    sourceUrl: input.sourceUrl ?? input.driveUrl ?? null,
    mediaUrl: input.mediaUrl ?? input.driveUrl ?? null,
    mimeType: input.mimeType ?? null,
    edition: input.edition ?? null,
    modifiedAt: input.modifiedAt ?? null,
    collection: input.collection ?? input.series ?? null,
    accessClass: input.accessClass ?? input.status ?? "REVIEW",
    degreeMapping: cloneArray(input.degreeMapping),
    status: input.status ?? "REVIEW",
  });
}

const seed = [...WORLD_LIBRARY_REGISTRY, ...DISCOVERED_SOURCE_FILES, ...WORLD_LIBRARY_PRODUCTION_BATCH_2, ...PRODUCTION_BATCH_3].map(canonicalResource);

function dateValue(value) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

function workKey(resource) {
  return String(resource.title ?? "")
    .normalize("NFKD")
    .replace(/\.pdf$/i, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLocaleLowerCase();
}

export function preferLatest(resources) {
  if (!Array.isArray(resources)) throw new TypeError("resources must be an array");
  const canonical = resources.map(canonicalResource);
  const groups = new Map();
  for (const resource of canonical) {
    const key = workKey(resource);
    const group = groups.get(key) ?? [];
    group.push(resource);
    groups.set(key, group);
  }
  const latest = [];
  const sourceVersions = {};
  for (const [key, group] of groups) {
    group.sort((a, b) => dateValue(b.modifiedAt) - dateValue(a.modifiedAt));
    latest.push(group[0]);
    sourceVersions[key] = freeze(group.map((resource, index) => index === 0 ? resource : freeze({ ...resource, status: "superseded" })));
  }
  return freeze({ latest: freeze(latest), sourceVersions: freeze(sourceVersions) });
}

export function libraryCatalogList({ resourceType, accessClass, status, collection } = {}) {
  const { latest } = preferLatest(seed);
  return freeze(latest.filter((r) =>
    (!resourceType || r.resourceType === resourceType) &&
    (!accessClass || r.accessClass === accessClass) &&
    (!status || r.status === status) &&
    (!collection || r.collection === collection)
  ));
}

export function libraryCatalogSearch(query, options = {}) {
  if (typeof query !== "string") throw new TypeError("query must be a string");
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return libraryCatalogList(options);
  return freeze(libraryCatalogList(options).filter((r) =>
    [r.title, r.author, r.description, r.edition, r.collection, ...(r.degreeMapping ?? [])]
      .filter(Boolean).join(" ").toLocaleLowerCase().includes(needle)
  ));
}

export function libraryResourceGet(id) {
  if (!id) throw new TypeError("id is required");
  return libraryCatalogList().find((r) => r.id === id) ?? null;
}

export function libraryResourceMedia(id) {
  const resource = libraryResourceGet(id);
  if (!resource) return null;
  return freeze({ id: resource.id, mediaUrl: resource.mediaUrl, mimeType: resource.mimeType, source: resource.source, sourceId: resource.sourceId });
}

export function libraryResourceCover(id) {
  const resource = libraryResourceGet(id);
  return resource ? freeze({ id: resource.id, coverImage: resource.coverImage }) : null;
}

export function libraryDegreeResources(degree) {
  if (degree === undefined || degree === null) throw new TypeError("degree is required");
  const target = String(degree).toLocaleLowerCase();
  return freeze(libraryCatalogList().filter((r) =>
    r.degreeMapping.some((mapping) => String(mapping).toLocaleLowerCase() === target)
  ));
}

export function librarySourceVersions(title) {
  if (!title) throw new TypeError("title is required");
  const { sourceVersions } = preferLatest(seed);
  return sourceVersions[workKey({ title })] ?? freeze([]);
}

export const WORLD_LIBRARY_OPERATIONS = freeze({
  "library.catalog.list": libraryCatalogList,
  "library.catalog.search": libraryCatalogSearch,
  "library.resource.get": libraryResourceGet,
  "library.resource.media": libraryResourceMedia,
  "library.resource.cover": libraryResourceCover,
  "library.degree.resources": libraryDegreeResources,
  "library.source.versions": librarySourceVersions,
});
