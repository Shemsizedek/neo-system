#!/usr/bin/env node
/**
 * NEOTERIC-011 storefront verifier.
 * Read-only: never changes catalog state and never submits checkout/payment.
 */
const origin = process.env.NEOTERIC_STOREFRONT_URL || "https://neotericmethod.minicart.com";
const expected = [
  ["NEO-NT-SVC-001","Noological Dialogue","144"],
  ["NEO-NT-SVC-002","Neotherapy Session","144"],
  ["NEO-NFM-001","True Green Light","144"],
  ["NEO-NT-EDU-101","Foundations of Neotherapy & Nous Field Therapy","144"],
  ["NEO-NT-PATH-001","Neotherapist Practitioner Pathway","144"]
];

const res = await fetch(origin,{redirect:"follow",headers:{"user-agent":"NEO-System-Neoteric-Verifier/1.0"}});
if (!res.ok) throw new Error(`Storefront HTTP ${res.status}`);
const html = await res.text();
const normalized = html.replace(/&amp;/g,"&").replace(/\s+/g," ");
const results = expected.map(([sku,title,price]) => ({
  sku,title,
  title_found: normalized.toLowerCase().includes(title.toLowerCase()),
  price_found: new RegExp(`(?:\\$|USD\\s*)${price}(?:\\.00)?(?:\\D|$)`,"i").test(normalized)
}));
const disclosure = "Experimental Noological sensory practice; not presented as an established clinical treatment.";
const report = {
  checked_at: new Date().toISOString(),
  origin: res.url,
  http_status: res.status,
  products: results,
  nfm001_disclosure_found: normalized.toLowerCase().includes(disclosure.toLowerCase()),
  live_verified: results.every(x=>x.title_found&&x.price_found) &&
    normalized.toLowerCase().includes(disclosure.toLowerCase())
};
console.log(JSON.stringify(report,null,2));
if (!report.live_verified) process.exitCode=2;
