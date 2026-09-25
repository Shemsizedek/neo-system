const feedUrl = process.env.GOOGLE_MERCHANT_FEED_URL || "https://shemsizedek.github.io/neo-system/api/merchant/google-merchant.xml";
const minItems = Number(process.env.GOOGLE_MERCHANT_MIN_ITEMS || 1);

const res = await fetch(feedUrl, { redirect: "follow" });
if (!res.ok) {
  throw new Error(`Merchant feed fetch failed: ${res.status} ${res.statusText} — ${feedUrl}`);
}

const xml = await res.text();
if (!xml.includes('<rss xmlns:g="http://base.google.com/ns/1.0"')) {
  throw new Error("Merchant feed is reachable but does not contain the expected Google RSS namespace.");
}

const itemCount = (xml.match(/<item>/g) || []).length;
if (itemCount < minItems) {
  throw new Error(`Merchant feed contains ${itemCount} item(s); expected at least ${minItems}.`);
}

const requiredTags = ["<g:id>", "<g:title>", "<g:link>", "<g:image_link>", "<g:price>"];
const missingTags = requiredTags.filter(tag => !xml.includes(tag));
if (missingTags.length) {
  throw new Error(`Merchant feed is missing required tag(s): ${missingTags.join(", ")}`);
}

console.log(JSON.stringify({
  ok: true,
  feed_url: feedUrl,
  item_count: itemCount,
  content_type: res.headers.get("content-type"),
  checked_at: new Date().toISOString()
}, null, 2));
