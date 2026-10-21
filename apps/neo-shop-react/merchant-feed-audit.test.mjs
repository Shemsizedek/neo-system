import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'neo-merchant-feed-test-'));
const script=new URL('./merchant-feed-audit.mjs',import.meta.url).pathname;
function audit(csv){const f=path.join(dir,'feed.csv');fs.writeFileSync(f,csv);const run=spawnSync(process.execPath,[script,f],{encoding:'utf8'});return {status:run.status,report:JSON.parse(run.stdout),error:run.stderr};}
try{
 const result=audit('id,title,link,price,availability,image_link\nA,Shirt,https://shop.holytemples.org/product/a,20.00 USD,in_stock,https://example.com/a.png\nB,Hoodie,https://shop.holytemples.org/,30.00 USD,in_stock,https://example.com/b.png\nB,Hoodie 2,https://example.myspreadshop.com/#!/,30.00 USD,in_stock,https://example.com/b.png\n');
 assert.equal(result.status,0);
 assert.equal(result.report.rows_checked,3);
 assert.equal(result.report.issue_counts.duplicate_id,1);
 assert.equal(result.report.issue_counts.homepage_instead_of_product_link,1);
 assert.equal(result.report.issue_counts.hash_routed_product_link,1);
 assert.equal(result.report.issue_counts.external_shop_domain_verify_claimed_website,1);
 const bad=audit('id,title\nA,Shirt\n');
 assert.equal(bad.status,1);
 assert.ok(bad.report.missing_columns.includes('link'));
 console.log('Merchant feed preflight regression checks passed');
}finally{fs.rmSync(dir,{recursive:true,force:true})}
