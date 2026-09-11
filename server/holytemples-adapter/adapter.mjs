import { libraryCatalogList, libraryCatalogSearch, libraryResourceGet } from "./world-library-catalog.mjs";

export const HOLY_TEMPLES = Object.freeze({
  site: "https://holytemples.org",
  worldLibrary: "https://holytemples.org/world-library/",
  store: Object.freeze({
    provider: "Spreadshop",
    shopName: "Shemsizedek",
    prefix: "https://Shemsizedek.myspreadshop.com",
  }),
});

export function health() {
  return Object.freeze({
    ok: true,
    service: "holytemples-adapter",
    mode: "live-production",
    namespaces: ["library", "store", "noogle"],
  });
}

export function libraryCatalog(records) {
  if (records === undefined) return libraryCatalogList({ accessClass: "PUBLIC_WORLD_LIBRARY" });
  if (!Array.isArray(records)) throw new TypeError("records must be an array");
  return records.map((record) => Object.freeze({ ...record }));
}

export function authorizedLibraryCatalog(options = {}) {
  return libraryCatalogList(options);
}

export function searchPublicLibrary(query) {
  return libraryCatalogSearch(query, { accessClass: "PUBLIC_WORLD_LIBRARY" });
}

export function searchAuthorizedLibrary(query, options = {}) {
  return libraryCatalogSearch(query, options);
}

export function libraryAsset(assetId, { authorized = false } = {}) {
  const resource = libraryResourceGet(assetId);
  if (!resource) return null;
  if (!authorized && resource.accessClass !== "PUBLIC_WORLD_LIBRARY") return null;
  return resource;
}

export function classifyLibraryRecord(record) {
  if (!record || typeof record !== "object") throw new TypeError("record is required");
  const status = record.status;
  if (!["PUBLIC_WORLD_LIBRARY", "GISD_EXCLUSIVE", "DUPLICATE", "REVIEW"].includes(status)) {
    throw new RangeError("invalid library status");
  }
  return Object.freeze({ ...record, status });
}

export function storeCatalog() {
  return HOLY_TEMPLES.store;
}
