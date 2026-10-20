import http from "node:http";
import {timingSafeEqual} from "node:crypto";
const PORT=Number(process.env.PORT||3000);
const TOKEN=process.env.NEO_CATALOG_TOKEN||"";
const FEED=process.env.NEO_CATALOG_FEED_URL||"";
const ALLOWED_HOSTS=(process.env.NEO_CATALOG_ALLOWED_HOSTS||"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
const MAX_BYTES=2_000_000;
const publicHealth={service:"neo-shop-catalog",version:"0.1.0",mode:"read_only",feedConfigured:!!FEED,credentialsConfigured:!!TOKEN,publishingEnabled:false,metaConnected:false,museConnected:false};
function reply(res,status,body){res.writeHead(status,{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(body));}
function authorize(req){if(!TOKEN)return false;const v=(req.headers.authorization||"").replace(/^Bearer /i,"");const a=Buffer.from(v),b=Buffer.from(TOKEN);return a.length===b.length&&timingSafeEqual(a,b);}
function validHttps(raw){try{const url=new URL(raw);return url.protocol==="https:"&&!url.username&&!url.password&&!url.port&&!url.hostname.endsWith(".local")&&!/^(localhost|\d+\.\d+\.\d+\.\d+)$/.test(url.hostname);}catch{return false;}}
function normalize(p){if(!p||typeof p!=="object")return null;
const title=String(p.title||"").trim(),id=String(p.source_product_id||"").trim(),link=String(p.canonical_url||"");
if(!title||!id||!validHttps(link)||p.catalog_approved!==true||p.visibility!=="public")return null;
if(!["in_stock","out_of_stock","unknown"].includes(p.availability))return null;
return {source_product_id:id,title,description:String(p.description||"").slice(0,3000),canonical_url:link,image_url:validHttps(p.image_url)?p.image_url:null,availability:p.availability,catalog_approved:true,native_tag_eligible:p.native_tag_eligible===true,source:String(p.source||"external")};}
async function readFeed(){
if(!FEED||!validHttps(FEED))throw Error("feed_not_configured");
const host=new URL(FEED).hostname.toLowerCase();if(!ALLOWED_HOSTS.includes(host))throw Error("feed_host_not_allowlisted");
const r=await fetch(FEED,{headers:{accept:"application/json"},signal:AbortSignal.timeout(8000),redirect:"error"});
if(!r.ok)throw Error("feed_http_"+r.status);
if(Number(r.headers.get("content-length")||0)>MAX_BYTES)throw Error("feed_too_large");
const txt=await r.text();if(Buffer.byteLength(txt)>MAX_BYTES)throw Error("feed_too_large");
const v=JSON.parse(txt);if(!Array.isArray(v))throw Error("feed_must_be_array");
return {total:v.length,products:v.slice(0,2000).map(normalize).filter(Boolean)};
}
async function body(req){let s="";for await(const chunk of req){s+=chunk;if(s.length>32768)throw Error("request_too_large");}return JSON.parse(s);}
const server=http.createServer(async(req,res)=>{
if(req.method==="GET"&&req.url==="/health")return reply(res,200,publicHealth);
if(!authorize(req))return reply(res,401,{error:"unauthorized"});
try{
if(req.method==="GET"&&req.url==="/v1/catalog"){const data=await readFeed();return reply(res,200,{...data,verifiedAt:new Date().toISOString(),mode:"read_only"});}
if(req.method==="POST"&&req.url==="/v1/select"){const b=await body(req);const feed=await readFeed();const words=new Set(String(b.text||"").toLowerCase().match(/[a-z0-9]{4,}/g)||[]);
const ranked=feed.products.filter(p=>p.availability==="in_stock").map(p=>({p,score:[...new Set((p.title+" "+p.description).toLowerCase().match(/[a-z0-9]{4,}/g)||[])].filter(w=>words.has(w)).length})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
return reply(res,200,{product:ranked[0]?.p||null,reason:ranked.length?"keyword_overlap":"no_verified_relevant_product",nativeTagAllowed:false,publishAllowed:false});}
return reply(res,404,{error:"not_found"});
}catch(e){return reply(res,503,{error:String(e.message||e)});}
});
server.listen(PORT,"0.0.0.0");
