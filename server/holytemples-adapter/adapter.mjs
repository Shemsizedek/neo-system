const READ_ONLY = true;

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
    mode: "read-only",
    mutations: false,
    namespaces: ["library", "store"],
  });
}

export function libraryCatalog(records = []) {
  if (!Array.isArray(records)) throw new TypeError("records must be an array");
  return records.map((record) => Object.freeze({ ...record }));
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

export function assertReadOnly() {
  return READ_ONLY;
}

export function mutate() {
  throw new Error("Holy Temples adapter is read-only; mutations are disabled");
}
