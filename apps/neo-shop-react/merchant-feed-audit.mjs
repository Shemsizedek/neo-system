#!/usr/bin/env node
// MERCHANT-042: offline, read-only Google Merchant product-feed preflight.
// Usage: node apps/neo-shop-react/merchant-feed-audit.mjs /path/to/export.csv
// Reads an exported CSV locally; prints findings. Does not contact Google or change products.
import fs from 'node:fs';
const p=process.argv[2];
if(!p){console.error('Usage: node merchant-feed-audit.mjs export.csv');process.exit(2)}
const raw=fs.readFileSync(p,'utf8').replace(/^\uFEFF/,'');
function parseCSV(str){
 const rows=[];let row=[],s='',quoted=false;
 for(let i=0;i<str.length;i++){const ch=str[i];
  if(ch==='"'){if(quoted&&str[i+1]==='"'){s+='"';i++}else quoted=!quoted}
  else if(ch===','&&!quoted){row.push(s);s=''}
  else if((ch==='\n'||ch==='\r')&&!quoted){if(ch==='\r'&&str[i+1]==='\n')i++;row.push(s);if(row.some(v=>v!==''))rows.push(row);row=[];s=''}
  else s+=ch;
 }
 if(quoted)throw Error('Unclosed quote in CSV');
 if(s||row.length){row.push(s);rows.push(row)}return rows;
}
const rows=parseCSV(raw),head=(rows.shift()||[]).map(v=>v.trim().toLowerCase().replace(/[ _-]+/g,'_'));
const pos=(...keys)=>keys.map(k=>head.indexOf(k)).find(i=>i>=0)??-1;
const cols={id:pos('id','offer_id','product_id'),link:pos('link','product_link','url'),price:pos('price'),availability:pos('availability'),title:pos('title'),image:pos('image_link')};
const findings=[],ids=new Map();let checked=0;
const missing_columns=Object.entries(cols).filter(([,idx])=>idx<0).map(([name])=>name);
if(missing_columns.length)console.error('Feed schema incomplete: missing columns '+missing_columns.join(', '));
const hostname_counts={};
for(const [idx,row] of rows.entries()){const n=idx+2;checked++;
 const val=k=>cols[k]<0?'':(row[cols[k]]||'').trim();
 if(!val('id'))findings.push([n,'missing_id']);
 else if(ids.has(val('id')))findings.push([n,'duplicate_id',val('id')]);
 else ids.set(val('id'),n);
 if(!val('title'))findings.push([n,'missing_title']);
 const link=val('link');if(!link)findings.push([n,'missing_link']);else {
  try{const u=new URL(link);if(u.protocol!=='https:')findings.push([n,'non_https_link']);
   hostname_counts[u.hostname]=(hostname_counts[u.hostname]||0)+1;
   if(u.hostname==='shop.holytemples.org'&&u.pathname==='/'&&!u.hash.includes('!/'))findings.push([n,'not_distinct_product_destination']);
   if(u.hostname.endsWith('.myspreadshop.com'))findings.push([n,'external_shop_domain_verify_claimed_website',u.hostname]);
   if(u.hash.startsWith('#!'))findings.push([n,'hash_routed_product_link']);
   if(u.pathname==='/'&&!u.search&&!u.hash)findings.push([n,'homepage_instead_of_product_link']);
  }catch{findings.push([n,'invalid_link'])}
 }
 if(!val('image'))findings.push([n,'missing_image_link']);
 if(!val('price'))findings.push([n,'missing_price']);
 else if(!/^\d+(\.\d{1,2})?\s+[A-Z]{3}$/.test(val('price')))findings.push([n,'check_price_format',val('price')]);
 if(!val('availability'))findings.push([n,'missing_availability']);
}
if(missing_columns.length)process.exitCode=1;
console.log(JSON.stringify({rows_checked:checked,available_columns:cols,missing_columns,landing_hosts:hostname_counts,issue_counts:Object.fromEntries([...new Set(findings.map(x=>x[1]))].map(k=>[k,findings.filter(x=>x[1]===k).length])),sample_findings:findings.slice(0,100),note:'Offline syntax and completeness checks only. Does not confirm product reachability, Google policy status, checkout, or seller identity.'},null,2));
