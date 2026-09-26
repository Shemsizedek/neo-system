const accountId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID || "5429352076";
const developerEmail = process.env.GOOGLE_MERCHANT_DEVELOPER_EMAIL || "NooneUniversity@gmail.com";
const token = (process.env.GOOGLE_MERCHANT_ACCESS_TOKEN || "").trim();

if (!token) throw new Error("GOOGLE_MERCHANT_ACCESS_TOKEN is required.");

const url = `https://merchantapi.googleapis.com/accounts/v1/accounts/${accountId}/developerRegistration:registerGcp`;
const res = await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ developerEmail })
});
const body = await res.text();
let payload = null;
try { payload = body ? JSON.parse(body) : null; } catch { payload = body; }

if (!res.ok) {
  const reason = payload?.error?.details?.find?.(x => x?.reason)?.reason;
  if (reason === "ALREADY_REGISTERED" || /already registered/i.test(body)) {
    console.log(JSON.stringify({ ok: true, already_registered: true, payload }, null, 2));
    process.exit(0);
  }
  throw new Error(`Merchant developer registration failed: ${res.status} ${res.statusText}\n${JSON.stringify(payload, null, 2)}`);
}

console.log(JSON.stringify({
  ok: true,
  account_id: accountId,
  developer_email: developerEmail,
  registration: payload
}, null, 2));
