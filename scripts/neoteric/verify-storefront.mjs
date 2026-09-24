#!/usr/bin/env node
/**
 * NEOTERIC-016 storefront verifier.
 * Read-only: never changes catalog state and never submits checkout/payment.
 *
 * Verification lanes:
 * 1. Initial storefront HTML.
 * 2. Same-origin public resources referenced by that HTML (scripts/JSON/manifests).
 * 3. Same-origin public links likely to contain catalog/product/store data.
 *
 * This distinguishes a genuinely missing public catalog from product data that is
 * present but loaded dynamically after the initial document response.
 */
const origin = process.env.NEOTERIC_STOREFRONT_URL || "https://neotericmethod.minicart.com";
const expected = [
  ["NEO-NT-SVC-001","Noological Dialogue","144"],
  ["NEO-NT-SVC-002","Neotherapy Session","144"],
  ["NEO-NFM-001","True Green Light","144"],
  ["NEO-NT-EDU-101","Foundations of Neotherapy & Nous Field Therapy","144"],
  ["NEO-NT-PATH-001","Neotherapist Practitioner Pathway","144"]
];
const disclosure = "Experimental Noological sensory practice; not presented as an established clinical treatment.";
const ua = {"user-agent":"NEO-System-Neoteric-Verifier/2.0"};
const maxResources = Number(process.env.NEOTERIC_VERIFY_MAX_RESOURCES || 30);

function normalize(value="") {
  return value.replace(/&amp;/g,"&").replace(/\\u0026/gi,"&").replace(/\\u003c/gi,"<").replace(/\\u003e/gi,">").replace(/\\s+/g," ");
}
function sameOriginUrl(value, base) {
  try {
    const u = new URL(value, base);
    const root = new URL(base);
    return u.origin === root.origin ? u : null;
  } catch { return null; }
}
function extractPublicResources(html, base) {
  const urls = new Set();
  const attr = /(?:src|href)=["']([^"'#]+)["']/gi;
  for (const m of html.matchAll(attr)) {
    const u = sameOriginUrl(m[1], base);
    if (!u) continue;
    const p = u.pathname.toLowerCase();
    if (/\\.(?:js|mjs|json|webmanifest)(?:$|\\?)/.test(u.href) || /product|catalog|store|shop|item|listing|api/.test(p)) urls.add(u.href);
  }
  return [...urls].slice(0,maxResources);
}
async function fetchText(url) {
  try {
    const res = await fetch(url,{redirect:"follow",headers:ua});
    if (!res.ok) return {url,status:res.status,text:""};
    const type=(res.headers.get("content-type")||"").toLowerCase();
    if (type && !/(text|json|javascript|xml|html)/.test(type)) return {url:res.url,status:res.status,text:""};
    return {url:res.url,status:res.status,text:await res.text()};
  } catch (error) {
    return {url,status:0,text:"",error:String(error?.message||error)};
  }
}
function inspect(text) {
  const normalized=normalize(text);
  return expected.map(([sku,title,price])=>({
    sku,title,
    sku_found: normalized.toLowerCase().includes(sku.toLowerCase()),
    title_found: normalized.toLowerCase().includes(title.toLowerCase()),
    price_found: new RegExp(`(?:\\$|USD\\s*)${price}(?:\\.00)?(?:\\D|$)`,"i").test(normalized)
  }));
}

const root=await fetchText(origin);
if (root.status < 200 || root.status >= 400) throw new Error(`Storefront HTTP ${root.status}`);
const resourceUrls=extractPublicResources(root.text,root.url);
const resources=[];
for (const url of resourceUrls) resources.push(await fetchText(url));
const combined=[root.text,...resources.map(x=>x.text)].join("\n");
const products=inspect(combined);
const initialProducts=inspect(root.text);
const disclosureFound=normalize(combined).toLowerCase().includes(disclosure.toLowerCase());
const initialDisclosureFound=normalize(root.text).toLowerCase().includes(disclosure.toLowerCase());
const allProductsFound=products.every(x=>x.title_found&&x.price_found);
const dynamicEvidence=products.some((x,i)=>(x.title_found&&!initialProducts[i].title_found)||(x.price_found&&!initialProducts[i].price_found)||x.sku_found) || (disclosureFound&&!initialDisclosureFound);
const diagnosis=allProductsFound&&disclosureFound
  ? (dynamicEvidence ? "PUBLIC_CATALOG_DYNAMICALLY_RENDERED" : "PUBLIC_CATALOG_IN_INITIAL_HTML")
  : (dynamicEvidence ? "PARTIAL_PUBLIC_CATALOG_DATA" : "PUBLIC_CATALOG_NOT_DISCOVERED");
const report={
  checked_at:new Date().toISOString(),
  origin:root.url,
  http_status:root.status,
  verification_version:"NEOTERIC-016",
  resources_checked:resources.map(x=>({url:x.url,status:x.status,bytes:x.text.length,error:x.error||null})),
  initial_html:{products:initialProducts,nfm001_disclosure_found:initialDisclosureFound},
  public_resource_scan:{products,nfm001_disclosure_found:disclosureFound,dynamic_evidence_found:dynamicEvidence},
  diagnosis,
  live_verified:allProductsFound&&disclosureFound
};
console.log(JSON.stringify(report,null,2));
if (!report.live_verified) process.exitCode=2;
