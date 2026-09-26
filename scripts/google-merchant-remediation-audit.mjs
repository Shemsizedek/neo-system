const accountId = process.env.GOOGLE_MERCHANT_ACCOUNT_ID || "5429352076";
const feedUrl = process.env.GOOGLE_MERCHANT_FEED_URL || "https://shemsizedek.github.io/neo-system/api/merchant/google-merchant.xml";
const token = (process.env.GOOGLE_MERCHANT_ACCESS_TOKEN || "").trim();
if (!token) throw new Error("GOOGLE_MERCHANT_ACCESS_TOKEN is required.");

async function json(url) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const text = await res.text();
  if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}\n${text}`);
  return JSON.parse(text);
}

const homepage = await json(`https://merchantapi.googleapis.com/accounts/v1/accounts/${accountId}/homepage`);

const feedRes = await fetch(feedUrl);
const feed = await feedRes.text();
if (!feedRes.ok) throw new Error(`Feed fetch failed: ${feedRes.status} ${feedRes.statusText}`);

const blocks = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
const val = (b, tag) => {
  const m = b.match(new RegExp(`<g:${tag}>([\\s\\S]*?)<\\/g:${tag}>`, "i"));
  return m ? m[1].replace(/&amp;/g,"&").replace(/&quot;/g,'"').trim() : "";
};
const host = u => { try { return new URL(u).hostname.toLowerCase(); } catch { return ""; } };

const rows = blocks.map(b => ({
  id: val(b,"id"),
  title: val(b,"title"),
  link: val(b,"link"),
  price: val(b,"price"),
  image_link: val(b,"image_link"),
  age_group: val(b,"age_group"),
  gender: val(b,"gender"),
  color: val(b,"color"),
  size: val(b,"size"),
  item_group_id: val(b,"item_group_id")
}));

const counts = rows.reduce((a,r)=>{
  const h=host(r.link)||"(invalid)";
  a.link_hosts[h]=(a.link_hosts[h]||0)+1;
  if(!r.price) a.missing_price++;
  if(!r.link) a.missing_link++;
  if(!r.image_link) a.missing_image++;
  if(!r.age_group) a.missing_age_group++;
  if(!r.gender) a.missing_gender++;
  if(!r.color) a.missing_color++;
  if(!r.size) a.missing_size++;
  return a;
},{link_hosts:{},missing_price:0,missing_link:0,missing_image:0,missing_age_group:0,missing_gender:0,missing_color:0,missing_size:0});

const homepageHost = host(homepage?.uri || "");
const linkHostMatchesHomepage = homepageHost
  ? Object.entries(counts.link_hosts).filter(([h])=>h!=="(invalid)").every(([h]) => h === homepageHost || h.endsWith("." + homepageHost) || homepageHost.endsWith("." + h))
  : false;

console.log(JSON.stringify({
  account_id: accountId,
  homepage,
  feed_url: feedUrl,
  feed_http_status: feedRes.status,
  item_count: rows.length,
  counts,
  homepage_host: homepageHost,
  link_host_matches_homepage: linkHostMatchesHomepage,
  sample: rows.slice(0,12)
}, null, 2));
