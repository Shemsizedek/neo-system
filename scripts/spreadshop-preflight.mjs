import fs from "node:fs";

const required = {
  SPREADSHOP_SHOP_ID: process.env.SPREADSHOP_SHOP_ID || "",
  SPREADSHOP_API_KEY: process.env.SPREADSHOP_API_KEY || ""
};
const platform = (process.env.SPREADSHOP_PLATFORM || "na").toLowerCase();

const missing = Object.entries(required).filter(([,v]) => !v.trim()).map(([k]) => k);
const status = {
  checked_at: new Date().toISOString(),
  platform,
  configured: missing.length === 0,
  missing
};

fs.mkdirSync("merch/house-of-negus/state", {recursive:true});
fs.writeFileSync("merch/house-of-negus/state/preflight.json", JSON.stringify(status,null,2));

const summary = [
  "# House of Negus Spreadshop Preflight",
  "",
  `- Platform: **${platform.toUpperCase()}**`,
  `- Connection configured: **${status.configured ? "YES" : "NO"}**`,
  `- Missing configuration: **${missing.length ? missing.join(", ") : "none"}**`,
  "",
  "Secrets are checked only for presence; values are never printed."
].join("\n");

if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary+"\n");
console.log(summary);

if (!status.configured) process.exitCode = 2;
