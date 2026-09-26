import fs from "node:fs";
import path from "node:path";

const inputPath = process.env.SPREADSHOP_SELLABLES_PATH || "merch/house-of-negus/state/sellables.json";
const outputDir = process.env.GOOGLE_MERCHANT_OUTPUT_DIR || "merch/house-of-negus/generated";
const feedPath = path.join(outputDir, "google-merchant.xml");
const reportPath = path.join(outputDir, "google-merchant-report.json");
const platformRaw = String(process.env.SPREADSHOP_PLATFORM || "").trim();
const storeUrl = (process.env.SPREADSHOP_STORE_URL || (/^https?:\/\//i.test(platformRaw) ? platformRaw : "")).replace(/\/$/, "");

const pick = (obj, paths) => {
  for (const p of paths) {
    const v = p.split(".").reduce((a, k) => (a == null ? undefined : a[k]), obj);
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return null;
};

const esc = (v) => String(v ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&apos;");

const normalizeUrl = (v) => {
  if (!v) return null;
  const s = String(v).trim();
  if (/^https?:\/\//i.test(s)) return s;
  if (storeUrl && s.startsWith("/")) return storeUrl + s;
  return null;
};

const walk = (value, path = "", out = []) => {
  if (value == null) return out;
  if (Array.isArray(value)) {
    value.slice(0, 5).forEach((v, i) => walk(v, `${path}[${i}]`, out));
    return out;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k, out);
    return out;
  }
  out.push({ path, key: path.split(".").pop()?.replace(/\[\d+\]/g, "") || path, value });
  return out;
};

const scalarEntries = (row) => walk(row);

const findByKey = (row, keyPattern, valuePredicate = () => true) => {
  for (const e of scalarEntries(row)) {
    if (keyPattern.test(e.key) && valuePredicate(e.value, e.path)) return e.value;
  }
  return null;
};

const firstHttpByPath = (row, pathPattern) => {
  for (const e of scalarEntries(row)) {
    const s = String(e.value ?? "").trim();
    if (pathPattern.test(e.path) && /^https?:\/\//i.test(s)) return s;
  }
  return null;
};

const normalizePrice = (row) => {
  let amount = pick(row, ["price.amount", "price.value", "price", "retailPrice.amount", "retailPrice.value"]);
  if (typeof amount === "object") amount = null;
  if (amount == null) {
    amount = findByKey(row, /^(amount|price|value)$/i, v => Number.isFinite(Number(v)) && Number(v) > 0);
  }
  let currency = pick(row, ["price.currency", "currency", "retailPrice.currency"]);
  if (!currency || !/^[A-Za-z]{3}$/.test(String(currency))) {
    currency = findByKey(row, /currency$/i, v => /^[A-Za-z]{3}$/.test(String(v)));
  }
  if (!currency || !/^[A-Za-z]{3}$/.test(String(currency))) currency = "USD";
  const n = Number(amount);
  return Number.isFinite(n) && n > 0 ? `${n.toFixed(2)} ${String(currency).toUpperCase()}` : null;
};

const normalizeImage = (row) => {
  const direct = pick(row, ["imageUrl", "image.url", "defaultImage.url", "previewImage.url", "appearance.imageUrl"]);
  const u = normalizeUrl(direct);
  if (u) return u;
  const images = pick(row, ["images", "previewImages"]);
  if (Array.isArray(images)) {
    for (const img of images) {
      const cand = normalizeUrl(typeof img === "string" ? img : (img?.url || img?.href));
      if (cand) return cand;
    }
  }
  return firstHttpByPath(row, /(image|preview|picture|media|resource)/i);
};

const normalizeLink = (row) => {
  const direct = pick(row, ["shopUrl", "url", "productUrl", "detailUrl", "href"]);
  const u = normalizeUrl(direct);
  if (u) return u;
  const discovered = firstHttpByPath(row, /(shop|product|sellable|detail|link|href|url)/i);
  if (discovered && !/(image|preview|picture|media)/i.test(discovered)) return discovered;
  const id = pick(row, ["sellableId", "id"]) || findByKey(row, /^(sellableId|id)$/i);
  return storeUrl && id ? `${storeUrl}/shop/product/${encodeURIComponent(String(id))}` : null;
};

const normalizeItem = (row) => {
  const id = String(pick(row, ["sellableId", "id", "ideaId"]) || findByKey(row, /^(sellableId|id|ideaId)$/i) || "").trim();
  const title = String(pick(row, ["name", "title"]) || findByKey(row, /^(name|title)$/i) || "").trim();
  const description = String(pick(row, ["description", "name", "title"]) || findByKey(row, /^(description|name|title)$/i) || "").trim();
  const link = normalizeLink(row);
  const image = normalizeImage(row);
  const price = normalizePrice(row);
  const availabilityRaw = String(pick(row, ["availability", "status"]) || "in stock").toLowerCase();
  const availability = /out|sold|unavailable/.test(availabilityRaw) ? "out of stock" : "in stock";
  const brand = String(pick(row, ["brand", "brandName"]) || "House of Negus").trim();

  const missing = [];
  if (!id) missing.push("id");
  if (!title) missing.push("title");
  if (!link) missing.push("link");
  if (!image) missing.push("image_link");
  if (!price) missing.push("price");

  return { id, title, description, link, image, price, availability, brand, missing };
};

if (!fs.existsSync(inputPath)) {
  throw new Error(`Spreadshop snapshot not found: ${inputPath}. Run spreadshop-sync-v2.mjs first.`);
}

const source = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const rows = Array.isArray(source.sellables) ? source.sellables : [];
const normalized = rows.map(normalizeItem);
const valid = normalized.filter(x => x.missing.length === 0);
const invalid = normalized.filter(x => x.missing.length > 0);

fs.mkdirSync(outputDir, { recursive: true });

const itemsXml = valid.map(item => `    <item>
      <g:id>${esc(item.id)}</g:id>
      <g:title>${esc(item.title)}</g:title>
      <g:description>${esc(item.description)}</g:description>
      <g:link>${esc(item.link)}</g:link>
      <g:image_link>${esc(item.image)}</g:image_link>
      <g:availability>${esc(item.availability)}</g:availability>
      <g:price>${esc(item.price)}</g:price>
      <g:condition>new</g:condition>
      <g:brand>${esc(item.brand)}</g:brand>
      <g:identifier_exists>false</g:identifier_exists>
    </item>`).join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>House of Negus — Spreadshop</title>
    <link>${esc(storeUrl || "https://holytemples.org")}</link>
    <description>Google Merchant feed generated by NEO System from live Spreadshop sellables.</description>
${itemsXml}
  </channel>
</rss>
`;

fs.writeFileSync(feedPath, xml);
fs.writeFileSync(reportPath, JSON.stringify({
  generated_at: new Date().toISOString(),
  source_shop_id: source.shop_id ?? null,
  source_platform: source.platform ?? null,
  source_count: rows.length,
  accepted_count: valid.length,
  rejected_count: invalid.length,
  rejected: invalid.slice(0, 100).map(x => ({ id: x.id || null, title: x.title || null, missing: x.missing })),
  sample_schema_paths: rows[0] ? scalarEntries(rows[0]).map(e => e.path).slice(0, 250) : [],
  feed_path: feedPath
}, null, 2));

console.log(JSON.stringify({
  feed_path: feedPath,
  accepted_count: valid.length,
  rejected_count: invalid.length
}, null, 2));

if (rows.length > 0 && valid.length === 0) {
  console.error("No Merchant-valid rows. Sample Spreadshop schema paths:");
  console.error(JSON.stringify(rows[0] ? scalarEntries(rows[0]).map(e => e.path).slice(0, 250) : [], null, 2));
  process.exitCode = 2;
}
