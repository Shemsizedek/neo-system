import fs from "node:fs";

const inventoryPath="merch/house-of-negus/state/sellables.json";
if(!fs.existsSync(inventoryPath)){
  console.log("No sellables snapshot found; reconciliation skipped.");
  process.exit(0);
}

const data=JSON.parse(fs.readFileSync(inventoryPath,"utf8"));
const rows=Array.isArray(data.sellables)?data.sellables:[];
const norm=s=>String(s??"").trim().toLowerCase();
const aliases={
  "Masonic Handshake":["masonic handshake"],
  "Holy Keys":["crest of the holy see keys","crest of the holy see keys of nun"],
  "The Negus":["the negus"]
};

const families=new Map();
for(const r of rows){
  const familyKey=r.ideaId || r.mainDesignId || r.name;
  if(!families.has(familyKey)){
    families.set(familyKey,{
      family_key:familyKey,
      idea_id:r.ideaId ?? null,
      main_design_id:r.mainDesignId ?? null,
      name:r.name ?? null,
      description:r.description ?? null,
      tags:r.tags ?? [],
      sellable_count:0,
      product_type_ids:new Set(),
      sellable_ids:[]
    });
  }
  const fam=families.get(familyKey);
  fam.sellable_count++;
  if(r.productTypeId) fam.product_type_ids.add(r.productTypeId);
  if(r.sellableId) fam.sellable_ids.push(r.sellableId);
}

const familyList=[...families.values()].map(f=>({
  ...f,
  product_type_ids:[...f.product_type_ids].sort(),
}));

const expected_products=Object.entries(aliases).map(([expected,names])=>{
  const matchedFamilies=familyList.filter(f=>{
    const hay=[f.name,f.description,...(f.tags||[])].map(norm).join(" | ");
    return names.some(a=>hay.includes(norm(a)));
  });
  return {
    expected,
    matched_family_count:matchedFamilies.length,
    sellable_count:matchedFamilies.reduce((n,f)=>n+f.sellable_count,0),
    families:matchedFamilies.map(f=>({
      idea_id:f.idea_id,
      main_design_id:f.main_design_id,
      name:f.name,
      sellable_count:f.sellable_count,
      product_type_count:f.product_type_ids.length
    }))
  };
});

const baseline={
  generated_at:new Date().toISOString(),
  shop_id:data.shop_id,
  source_platform:data.platform,
  normalized_platform:"na",
  total_sellables:data.count ?? rows.length,
  total_families:familyList.length,
  families:familyList.map(f=>({
    idea_id:f.idea_id,
    main_design_id:f.main_design_id,
    name:f.name,
    sellable_count:f.sellable_count,
    product_type_count:f.product_type_ids.length,
    tags:f.tags
  }))
};

fs.mkdirSync("merch/house-of-negus/state",{recursive:true});
fs.writeFileSync("merch/house-of-negus/state/reconciliation.json",JSON.stringify({
  reconciled_at:new Date().toISOString(),
  shop_id:data.shop_id,
  total_sellables:baseline.total_sellables,
  total_families:baseline.total_families,
  expected_products
},null,2));
fs.writeFileSync("merch/house-of-negus/state/baseline.json",JSON.stringify(baseline,null,2));

console.log(JSON.stringify({
  shop_id:data.shop_id,
  total_sellables:baseline.total_sellables,
  total_families:baseline.total_families,
  expected_products
},null,2));
