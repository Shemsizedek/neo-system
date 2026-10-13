import fs from "node:fs";
import path from "node:path";

const inputPath = process.env.SPREADSHOP_SELLABLES_PATH || "merch/house-of-negus/state/sellables.json";
const outputDir = process.env.OPENAI_COMMERCE_OUTPUT_DIR || "merch/house-of-negus/generated";
const feedPath = path.join(outputDir, "openai-products.csv");
const reportPath = path.join(outputDir, "openai-products-report.json");
const storeUrl = (process.env.SPREADSHOP_STORE_URL || "https://shop.holytemples.org").replace(/\/$/, "");
const sellerName = process.env.OPENAI_COMMERCE_SELLER_NAME || "World Temple";

const pick=(obj,paths)=>{for(const p of paths){const v=p.split(".").reduce((a,k)=>a==null?undefined:a[k],obj);if(v!==undefined&&v!==null&&String(v).trim()!=="")return v}return null};
const walk=(value,path="",out=[])=>{if(value==null)return out;if(Array.isArray(value)){value.slice(0,8).forEach((v,i)=>walk(v,`${path}[${i}]`,out));return out}if(typeof value==="object"){for(const [k,v] of Object.entries(value))walk(v,path?`${path}.${k}`:k,out);return out}out.push({path,key:path.split(".").pop()?.replace(/\[\d+\]/g,"")||path,value});return out};
const scalars=row=>walk(row);
const findByKey=(row,re,pred=()=>true)=>{for(const e of scalars(row)){if(re.test(e.key)&&pred(e.value,e.path))return e.value}return null};
const firstHttp=(row,re)=>{for(const e of scalars(row)){const s=String(e.value??"").trim();if(re.test(e.path)&&/^https?:\/\//i.test(s))return s}return null};
const normalizeUrl=v=>{if(!v)return null;const s=String(v).trim();if(/^https?:\/\//i.test(s))return s;if(storeUrl&&s.startsWith("/"))return storeUrl+s;return null};
const canonical=v=>{const u=normalizeUrl(v);if(!u)return null;try{const p=new URL(u),c=new URL(storeUrl);if(/\.myspreadshop\.com$/i.test(p.hostname)||p.hostname.toLowerCase()===c.hostname.toLowerCase())return c.origin+p.pathname+p.search+p.hash}catch{}return u};
const money=row=>{let amount=pick(row,["price.amount","price.value","price","retailPrice.amount","retailPrice.value"]);if(typeof amount==="object")amount=null;if(amount==null)amount=findByKey(row,/^(amount|price|value)$/i,v=>Number.isFinite(Number(v))&&Number(v)>0);let currency=pick(row,["price.currency","currency","retailPrice.currency"]);if(!currency||!/^[A-Za-z]{3}$/.test(String(currency)))currency=findByKey(row,/currency$/i,v=>/^[A-Za-z]{3}$/.test(String(v)));if(!currency)currency="USD";const n=Number(amount);return Number.isFinite(n)&&n>0?`${n.toFixed(2)} ${String(currency).toUpperCase()}`:null};
const image=row=>{const d=normalizeUrl(pick(row,["imageUrl","image.url","defaultImage.url","previewImage.url","appearance.imageUrl"]));if(d)return d;const arr=pick(row,["images","previewImages"]);if(Array.isArray(arr)){for(const i of arr){const u=normalizeUrl(typeof i==="string"?i:(i?.url||i?.href));if(u)return u}}return firstHttp(row,/(image|preview|picture|media|resource)/i)};
const link=row=>{const d=canonical(pick(row,["shopUrl","url","productUrl","detailUrl","href"]));if(d)return d;const found=firstHttp(row,/(shop|product|sellable|detail|link|href|url)/i);if(found&&!/(image|preview|picture|media)/i.test(found))return canonical(found);const id=pick(row,["sellableId","id"])||findByKey(row,/^(sellableId|id)$/i);return id?`${storeUrl}/shop/product/${encodeURIComponent(String(id))}`:null};
const availability=row=>{const s=String(pick(row,["availability","status"])||"unknown").toLowerCase();if(/out|sold|unavailable/.test(s))return"out_of_stock";if(/pre.?order/.test(s))return"pre_order";if(/back.?order/.test(s))return"backorder";if(/in.?stock|available|active/.test(s))return"in_stock";return"unknown"};
const csv=v=>{const s=String(v??"");return /[",\n\r]/.test(s)?`"${s.replace(/"/g,'""')}"`:s};

function normalize(row){
 const item_id=String(pick(row,["sellableId","id","ideaId"])||findByKey(row,/^(sellableId|id|ideaId)$/i)||"").trim();
 const title=String(pick(row,["name","title"])||findByKey(row,/^(name|title)$/i)||"").trim();
 const description=String(pick(row,["description","name","title"])||findByKey(row,/^(description|name|title)$/i)||"").trim();
 const url=link(row);
 const brand=String(pick(row,["brand","brandName"])||"House of Negus").trim();
 const image_url=image(row);
 const price=money(row);
 const out={item_id,title,description,url,brand,seller_name:sellerName,image_url,availability:availability(row),price};
 const missing=Object.entries(out).filter(([k,v])=>!v&&k!=="description").map(([k])=>k);
 return {...out,missing};
}

if(!fs.existsSync(inputPath))throw new Error(`Spreadshop snapshot not found: ${inputPath}`);
const source=JSON.parse(fs.readFileSync(inputPath,"utf8"));
const rows=Array.isArray(source.sellables)?source.sellables:[];
const normalized=rows.map(normalize);
const valid=normalized.filter(x=>x.missing.length===0);
const invalid=normalized.filter(x=>x.missing.length>0);
fs.mkdirSync(outputDir,{recursive:true});
const headers=["item_id","title","description","url","brand","seller_name","image_url","availability","price"];
const body=[headers.join(","),...valid.map(x=>headers.map(h=>csv(x[h])).join(","))].join("\n")+"\n";
fs.writeFileSync(feedPath,body);
fs.writeFileSync(reportPath,JSON.stringify({generated_at:new Date().toISOString(),source_shop_id:source.shop_id??null,source_platform:source.platform??null,source_count:rows.length,ready_count:valid.length,rejected_count:invalid.length,rejected:invalid.slice(0,100).map(x=>({item_id:x.item_id||null,title:x.title||null,missing:x.missing})),feed_path:feedPath},null,2));
console.log(JSON.stringify({feed_path:feedPath,ready_count:valid.length,rejected_count:invalid.length},null,2));
if(rows.length>0&&valid.length===0)process.exitCode=2;
