const accountId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID || "5429352076";
const shop = process.env.HOUSE_OF_NEGUS_SHOP_URL || "https://shop.holytemples.org";
const token = (process.env.GOOGLE_MERCHANT_ACCESS_TOKEN || "").trim();
if (!token) throw new Error("GOOGLE_MERCHANT_ACCESS_TOKEN is required.");

async function merchant(path) {
  const res = await fetch("https://merchantapi.googleapis.com" + path, {
    headers:{Authorization:`Bearer ${token}`,Accept:"application/json"}
  });
  const text = await res.text();
  let payload=null;
  try { payload=text?JSON.parse(text):null; } catch { payload=text; }
  if (!res.ok) throw new Error(`GET ${path} failed ${res.status}: ${JSON.stringify(payload)}`);
  return payload;
}

async function probe(path, needles=[]) {
  const url=shop+path;
  const res=await fetch(url,{redirect:"follow"});
  const body=await res.text();
  return {
    path,
    status:res.status,
    ok:res.ok,
    final_url:res.url,
    content_type:res.headers.get("content-type"),
    required_text:Object.fromEntries(needles.map(n=>[n,body.toLowerCase().includes(n.toLowerCase())]))
  };
}

const pages = [
  await probe("/",["HOUSE OF NEGUS","Shipping","Returns","Contact","spread_shop_config"]),
  await probe("/shipping",["Shipping","Spreadshop","delivery"]),
  await probe("/returns",["Returns & Refunds","Spreadshop","help@spreadshop.com"]),
  await probe("/contact",["Contact","help@spreadshop.com","1-800-381-0815","400 Penn Center Boulevard"]),
  await probe("/privacy",["Privacy","Spreadshop"]),
  await probe("/terms",["Terms","Spreadshirt, Inc.","Spreadshop"])
];

const account = await merchant(`/accounts/v1/accounts/${accountId}`);
const businessInfo = await merchant(`/accounts/v1/accounts/${accountId}/businessInfo`);
const homepage = await merchant(`/accounts/v1/accounts/${accountId}/homepage`);
const issues = await merchant(`/accounts/v1/accounts/${accountId}/issues?language_code=en-US&time_zone.id=America%2FChicago&page_size=1000`);

const pageChecks = pages.map(p=>({
  path:p.path,
  ok:p.ok && Object.values(p.required_text).every(Boolean),
  status:p.status,
  required_text:p.required_text
}));
const summary = {
  checked_at:new Date().toISOString(),
  storefront:{
    base:shop,
    all_pages_ok:pageChecks.every(x=>x.ok),
    pages:pageChecks
  },
  merchant:{
    account:{
      name:account?.name,
      accountName:account?.accountName,
      homePageUri:account?.homePageUri,
      languageCode:account?.languageCode,
      timeZone:account?.timeZone
    },
    businessInfo,
    homepage,
    accountIssues:(issues?.accountIssues||[]).map(i=>({
      name:i.name,
      title:i.title,
      severity:i.severity,
      detail:i.detail,
      documentationUri:i.documentationUri,
      impactedDestinations:i.impactedDestinations
    }))
  }
};
console.log(JSON.stringify(summary,null,2));
if (!summary.storefront.all_pages_ok) process.exit(2);
if (homepage?.uri !== shop || homepage?.claimed !== true) process.exit(3);
