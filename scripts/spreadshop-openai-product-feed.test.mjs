import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("builds OpenAI discovery CSV from Spreadshop snapshot",()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"openai-feed-"));
 const input=path.join(dir,"sellables.json");
 const out=path.join(dir,"out");
 fs.writeFileSync(input,JSON.stringify({shop_id:"123",platform:"na",sellables:[{id:"sku-1",name:"Temple Shirt",description:"Official Temple shirt",url:"https://Shemsizedek.myspreadshop.com/item/sku-1",imageUrl:"https://example.com/shirt.jpg",price:{amount:29.99,currency:"USD"},availability:"available",brand:"House of Negus"}]}));
 const r=spawnSync(process.execPath,["scripts/spreadshop-openai-product-feed.mjs"],{cwd:process.cwd(),env:{...process.env,SPREADSHOP_SELLABLES_PATH:input,OPENAI_COMMERCE_OUTPUT_DIR:out,SPREADSHOP_STORE_URL:"https://shop.holytemples.org"},encoding:"utf8"});
 assert.equal(r.status,0,r.stderr);
 const csv=fs.readFileSync(path.join(out,"openai-products.csv"),"utf8");
 assert.match(csv,/item_id,title,description,url,brand,seller_name,image_url,availability,price/);
 assert.match(csv,/sku-1,Temple Shirt,Official Temple shirt,https:\/\/shop\.holytemples\.org\/item\/sku-1,House of Negus,World Temple,https:\/\/example\.com\/shirt\.jpg,in_stock,29\.99 USD/);
});
