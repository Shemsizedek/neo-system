const freezeRecord = (record) => Object.freeze({ ...record });

export const LIBRARY_STATUS = Object.freeze({
  PUBLIC: "PUBLIC_WORLD_LIBRARY",
  GISD: "GISD_EXCLUSIVE",
  DUPLICATE: "DUPLICATE",
  REVIEW: "REVIEW",
});

const records = [
  {
    assetId: "world-library-neo-codex",
    canonicalTitle: "The New Ethiopian Order Novus (NEO) Codex",
    mediaType: "book",
    status: LIBRARY_STATUS.PUBLIC,
    driveFileId: "0B-oe5yNz2jy4VlVfTVJrNGFYczA",
    driveUrl: "https://drive.google.com/file/d/0B-oe5yNz2jy4VlVfTVJrNGFYczA/view?usp=drivesdk&resourcekey=0-A0KRlTOAFtWX2CIH2CWm5w",
    sourceTitle: "The New Ethiopian Order by Dr. L.Shamuel (Dr. NoobooHu Oonoo-NoopooH.pdf",
    modifiedAt: "2014-11-27T07:44:49.121Z",
  },
  {
    assetId: "world-library-black-devils",
    canonicalTitle: "Are There Black Devils?",
    mediaType: "book",
    status: LIBRARY_STATUS.PUBLIC,
    driveFileId: "1Fq-c_kABmuYtniEFJFw5hDXUkNVvlsm7",
    driveUrl: "https://drive.google.com/file/d/1Fq-c_kABmuYtniEFJFw5hDXUkNVvlsm7/view?usp=drivesdk",
    sourceTitle: "Are There Black Devils Part 1.pdf",
    modifiedAt: "2025-09-23",
  },
  {
    assetId: "world-library-leviathan-1",
    canonicalTitle: "Leviathan Part 1 (The Beast as the Anti-Christ)",
    mediaType: "book",
    status: LIBRARY_STATUS.PUBLIC,
    driveFileId: "10pc-cQR77eIJUBBWX6qgHUuNqXkULJvC",
    driveUrl: "https://drive.google.com/file/d/10pc-cQR77eIJUBBWX6qgHUuNqXkULJvC/view?usp=drivesdk",
    sourceTitle: "666 Leviathan The Beast As The Anti-Christ Part 1.pdf",
    modifiedAt: "2025-01-11",
  },
  {
    assetId: "world-library-luciferian-conspiracy",
    canonicalTitle: "The Luciferian Conspiracy",
    mediaType: "book",
    status: LIBRARY_STATUS.PUBLIC,
    driveFileId: "12CJYV-s1OUMsuLD43yIjxB1_q9ihxo76",
    driveUrl: "https://drive.google.com/file/d/12CJYV-s1OUMsuLD43yIjxB1_q9ihxo76/view?usp=drivesdk",
    sourceTitle: "The Luciferian Conspiracy",
    modifiedAt: "2025-01-11",
  },
  {
    assetId: "world-library-natural-economic-order",
    canonicalTitle: "The Natural Economic Order",
    mediaType: "book",
    status: LIBRARY_STATUS.REVIEW,
    driveFileId: null,
    driveUrl: null,
  },
  {
    assetId: "world-library-noone-project-full-disclosure",
    canonicalTitle: "The Noone Project Full Disclosure",
    mediaType: "book",
    status: LIBRARY_STATUS.REVIEW,
    driveFileId: null,
    driveUrl: null,
  },
  {
    assetId: "world-library-templist-scroll",
    canonicalTitle: "Templist Scroll",
    mediaType: "book",
    status: LIBRARY_STATUS.REVIEW,
    driveFileId: null,
    driveUrl: null,
  },
  {
    assetId: "world-library-clear-vision-tablet",
    canonicalTitle: "The Clear Vision Tablet",
    mediaType: "book",
    status: LIBRARY_STATUS.REVIEW,
    driveFileId: null,
    driveUrl: null,
  },
].map(freezeRecord);

export const WORLD_LIBRARY_REGISTRY = Object.freeze(records);

export function readWorldLibrary({ status } = {}) {
  const selected = status ? WORLD_LIBRARY_REGISTRY.filter((record) => record.status === status) : WORLD_LIBRARY_REGISTRY;
  return selected.map(freezeRecord);
}

export function readWorldLibraryAsset(assetId) {
  if (!assetId) throw new TypeError("assetId is required");
  const record = WORLD_LIBRARY_REGISTRY.find((entry) => entry.assetId === assetId);
  return record ? freezeRecord(record) : null;
}
