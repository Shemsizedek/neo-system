import fs from "node:fs";

const shop = process.env.SPREADSHOP_SHOP_ID;
const key = process.env.SPREADSHOP_API_KEY;
const platform = (process.env.SPREADSHOP_PLATFORM || "na").toLowerCase();

if (!shop || !key) {
  console.log("Spreadshop credentials not configured; verification skipped.");
  process.exit(0);
}

const host = platform === "eu" ? "api.spreadshirt.net" : "api.spreadshirt.com";
const base = `https://${host}/api/v1`;
const headers = {
  Authorization: `SprdAuth apiKey="${key}"`,
  "User-Agent": "NEO-System/1.0 (https://holytemples.org; admin@holytemples.org)",
  Accept: "application/json"
};

let page = 0;
const all = [];
while (page < 198) {
  const u = `${base}/shops/${encodeURIComponent(shop)}/sellables?page=${page}&mediaType=json`;
  const r = await fetch(u, { headers });
  if (!r.ok) throw new Error(`Spreadshop API ${r.status}: ${await r.text()}`);
  const j = await r.json();
  const rows = j.sellables || [];
  all.push(...rows);
  if (rows.length === 0 || all.length >= (j.count || 0)) break;
  page++;
}

fs.mkdirSync("merch/house-of-negus/state", { recursive: true });
fs.writeFileSync(
  "merch/house-of-negus/state/sellables.json",
  JSON.stringify({
    synced_at: new Date().toISOString(),
    platform,
    shop_id: shop,
    count: all.length,
    sellables: all
  }, null, 2)
);
console.log(`Synced ${all.length} sellables from Spreadshop ${platform.toUpperCase()}`);
