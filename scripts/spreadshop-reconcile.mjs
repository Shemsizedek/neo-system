import fs from "node:fs";

const inventoryPath="merch/house-of-negus/state/sellables.json";
if(!fs.existsSync(inventoryPath)){
  console.log("No sellables snapshot found; reconciliation skipped.");
  process.exit(0);
}
const data=JSON.parse(fs.readFileSync(inventoryPath,"utf8"));
const needles=["Masonic Handshake","Holy Keys","The Negus"];
const rows=Array.isArray(data.sellables)?data.sellables:[];
const textOf=x=>JSON.stringify(x).toLowerCase();
const matches=needles.map(name=>({
  expected:name,
  matches:rows.filter(x=>textOf(x).includes(name.toLowerCase())).map(x=>({
    id:x.id ?? null,
    name:x.name ?? x.title ?? null,
    description:x.description ?? null
  }))
}));
const out={reconciled_at:new Date().toISOString(),shop_id:data.shop_id,count:data.count ?? rows.length,expected_products:matches};
fs.writeFileSync("merch/house-of-negus/state/reconciliation.json",JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));
