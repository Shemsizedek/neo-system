const accountId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID || "5429352076";
const replacementUri = process.env.GOOGLE_MERCHANT_HOMEPAGE_URI || "https://shemsizedek.myspreadshop.com";
const feedUrl = process.env.GOOGLE_MERCHANT_FEED_URL || "https://shemsizedek.github.io/neo-system/api/merchant/google-merchant.xml";
const token = (process.env.GOOGLE_MERCHANT_ACCESS_TOKEN || "").trim();
const apply = process.env.GOOGLE_MERCHANT_APPLY || "";
const expected = "CONFIRM_MIGRATE_HOMEPAGE_TO_SPREADSHOP";

if (!token) throw new Error("GOOGLE_MERCHANT_ACCESS_TOKEN is required.");
if (apply !== expected) throw new Error(`Refusing homepage migration. Set GOOGLE_MERCHANT_APPLY=${expected}`);

async function api(url, {method="GET", body}={}) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? {"Content-Type":"application/json"} : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!res.ok) {
    const err = new Error(`${method} ${url} failed: ${res.status} ${res.statusText}\n${JSON.stringify(payload,null,2)}`);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}

const feedRes = await fetch(feedUrl, {redirect:"follow"});
const feed = await feedRes.text();
if (!feedRes.ok) throw new Error(`Replacement feed unavailable: ${feedRes.status} ${feedRes.statusText}`);
if (!/<g:price>[0-9]+\.[0-9]{2} USD<\/g:price>/.test(feed)) {
  throw new Error("Replacement feed does not yet contain corrected USD prices.");
}
if (/<g:price>[0-9]+\.[0-9]{2} [0-9]+<\/g:price>/.test(feed)) {
  throw new Error("Replacement feed still contains numeric currency IDs.");
}
if (!feed.toLowerCase().includes("shemsizedek.myspreadshop.com")) {
  throw new Error("Replacement feed does not point to the Spreadshop storefront.");
}

const base = `https://merchantapi.googleapis.com/accounts/v1/accounts/${accountId}/homepage`;
const before = await api(base);

async function update(uri) {
  return api(`${base}?update_mask=uri`, {
    method:"PATCH",
    body:{name:`accounts/${accountId}/homepage`, uri}
  });
}
async function claim() {
  return api(`${base}:claim`, {method:"POST", body:{overwrite:false}});
}

let updated = null;
let claimed = null;
let rolledBack = false;
let rollbackClaim = null;

try {
  updated = await update(replacementUri);
  claimed = await claim();
  if (!claimed?.claimed) throw new Error(`Homepage claim did not become true: ${JSON.stringify(claimed)}`);
} catch (err) {
  if (before?.uri) {
    try {
      await update(before.uri);
      rollbackClaim = await claim();
      rolledBack = true;
    } catch (rollbackErr) {
      console.error("ROLLBACK_FAILED", rollbackErr);
    }
  }
  console.error(JSON.stringify({
    migration_success:false,
    before,
    attempted_uri:replacementUri,
    updated,
    rolled_back:rolledBack,
    rollback_claim:rollbackClaim,
    error:String(err)
  }, null, 2));
  process.exit(2);
}

const after = await api(base);
console.log(JSON.stringify({
  migration_success:true,
  before,
  after,
  feed_url:feedUrl,
  feed_currency_verified:true,
  feed_spreadshop_links_verified:true
}, null, 2));
if (after?.uri !== replacementUri || after?.claimed !== true) process.exit(3);
