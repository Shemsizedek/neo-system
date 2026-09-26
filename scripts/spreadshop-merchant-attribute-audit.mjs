import fs from "node:fs";

const inputPath = process.env.SPREADSHOP_SELLABLES_PATH || "merch/house-of-negus/state/sellables.json";
if (!fs.existsSync(inputPath)) throw new Error(`Missing Spreadshop snapshot: ${inputPath}`);

const source = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const rows = Array.isArray(source.sellables) ? source.sellables : [];

const walk=(v,p="",out=[])=>{
  if(v==null) return out;
  if(Array.isArray(v)){v.slice(0,20).forEach((x,i)=>walk(x,`${p}[${i}]`,out)); return out;}
  if(typeof v==="object"){for(const [k,x] of Object.entries(v)) walk(x,p?`${p}.${k}`:k,out); return out;}
  out.push({path:p,value:v}); return out;
};

const keyCounts={};
const valueSamples={};
for(const row of rows.slice(0,500)){
  for(const e of walk(row)){
    const key=e.path.replace(/\[\d+\]/g,"[]");
    if(/(size|color|colour|appearance|gender|age|productType|category|type|name|price|currency)/i.test(key)){
      keyCounts[key]=(keyCounts[key]||0)+1;
      if(!valueSamples[key]) valueSamples[key]=[];
      if(valueSamples[key].length<8 && !valueSamples[key].includes(String(e.value))) valueSamples[key].push(String(e.value));
    }
  }
}
console.log(JSON.stringify({
  row_count: rows.length,
  inspected_rows: Math.min(rows.length,500),
  candidate_paths:Object.entries(keyCounts)
    .sort((a,b)=>b[1]-a[1])
    .slice(0,120)
    .map(([path,count])=>({path,count,samples:valueSamples[path]||[]}))
},null,2));
