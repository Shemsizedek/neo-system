import fs from "node:fs";
import path from "node:path";

const stateDir = "merch/house-of-negus/state";
const inventoryPath = path.join(stateDir, "sellables.json");
if (!fs.existsSync(inventoryPath)) throw new Error("Missing live sellables snapshot");

const dropsDir = "merch/house-of-negus/drops";
const manifests = fs.readdirSync(dropsDir).filter(n => /^\d{4}-\d{2}-.+\.json$/.test(n)).sort();
if (!manifests.length) throw new Error("No monthly drop manifests found");
const manifestPath = path.join(dropsDir, manifests.at(-1));
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
const rows = Array.isArray(inventory.sellables) ? inventory.sellables : [];
const norm = s => String(s ?? "").trim().toLowerCase();

const families = new Map();
for (const r of rows) {
  const key = r.ideaId || r.mainDesignId || r.name;
  if (!families.has(key)) families.set(key, {idea_id:r.ideaId??null, main_design_id:r.mainDesignId??null, name:r.name??null, sellable_count:0});
  families.get(key).sellable_count++;
}
const live = [...families.values()];

const results = (manifest.designs || []).map(d => {
  const knownIdea = d.spreadshop?.idea_id;
  const knownDesign = d.spreadshop?.main_design_id;
  const title = norm(d.title);
  const matches = live.filter(f =>
    (knownIdea && f.idea_id === knownIdea) ||
    (knownDesign && String(f.main_design_id) === String(knownDesign)) ||
    (title && norm(f.name) === title)
  );
  const sellables = matches.reduce((n,f)=>n+f.sellable_count,0);
  return {
    sku:d.sku,
    title:d.title,
    status:sellables > 0 ? "production_verified" : "pending_spreadshop_review",
    sellable_count:sellables,
    matches
  };
});

const verified = results.filter(r=>r.status === "production_verified").length;
const output = {
  verified_at:new Date().toISOString(),
  manifest:manifestPath,
  shop_id:inventory.shop_id,
  total_sellables:inventory.count ?? rows.length,
  total_design_families:live.length,
  expected_designs:results.length,
  verified_designs:verified,
  promotion_ready:results.length > 0 && verified === results.length,
  designs:results
};
fs.mkdirSync(stateDir,{recursive:true});
fs.writeFileSync(path.join(stateDir,"deployment-status.json"),JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
