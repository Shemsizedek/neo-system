import fs from "node:fs";
const shop=process.env.SPREADSHOP_SHOP_ID, key=process.env.SPREADSHOP_API_KEY;
if(!shop||!key){console.log("Spreadshop credentials not configured; verification skipped.");process.exit(0)}
const base="https://api.spreadshirt.net/api/v1";
let page=0, all=[];
while(page<198){
 const u=`${base}/shops/${encodeURIComponent(shop)}/sellables?page=${page}&mediaType=json&apiKey=${encodeURIComponent(key)}`;
 const r=await fetch(u,{headers:{"User-Agent":"NEO-System/1.0 (https://holytemples.org)"}});
 if(!r.ok) throw new Error(`Spreadshop API ${r.status}: ${await r.text()}`);
 const j=await r.json(); const rows=j.sellables||[]; all.push(...rows);
 if(rows.length===0 || all.length >= (j.count||0)) break; page++;
}
fs.mkdirSync("merch/house-of-negus/state",{recursive:true});
fs.writeFileSync("merch/house-of-negus/state/sellables.json",JSON.stringify({synced_at:new Date().toISOString(),shop_id:shop,count:all.length,sellables:all},null,2));
console.log(`Synced ${all.length} sellables`);
