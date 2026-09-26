import { execFileSync } from "node:child_process";

const accountId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID || "5429352076";
const base = "https://merchantapi.googleapis.com/datasources/v1";

function token() {
  if (process.env.GOOGLE_MERCHANT_ACCESS_TOKEN) return process.env.GOOGLE_MERCHANT_ACCESS_TOKEN.trim();
  return execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim();
}

const res = await fetch(`${base}/accounts/${accountId}/dataSources?pageSize=100`, {
  headers: { Authorization: `Bearer ${token()}` }
});
const body = await res.text();
if (!res.ok) throw new Error(`Merchant API list failed: ${res.status} ${res.statusText}\n${body}`);
console.log(body);
