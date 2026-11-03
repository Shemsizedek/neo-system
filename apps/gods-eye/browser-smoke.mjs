import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {normalizeSnapshot} from './earthquakes.mjs';
import {checkRecord} from './validation/check-record.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : 'playwright');
const schema=JSON.parse(await readFile(new URL('../../data/neo-gas/record-schema.json',import.meta.url)));
const dist=resolve(process.env.GODSEYE_DIST??'dist');
const assets=new Map([['/neo-system/gods-eye/','index.html'],['/neo-system/gods-eye/view.mjs','view.mjs'],['/neo-system/gods-eye/globe.mjs','globe.mjs'],['/neo-system/gods-eye/feed-state.mjs','feed-state.mjs']]);
const server=createServer(async(req,res)=>{
 const asset=assets.get(req.url);
 if(req.url==='/neo-system/'){res.end('NEO System');return;}
 if(!asset){res.writeHead(404);res.end();return;}
 try{res.setHeader('Content-Type',asset.endsWith('.mjs')?'text/javascript':'text/html');res.end(await readFile(resolve(dist,'gods-eye',asset)));}catch{res.writeHead(500);res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await chromium.launch({headless:true});
 for(const width of [390,1280]){
  const page=await browser.newPage({viewport:{width,height:844}});const errors=[],external=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:'))external.push(r.url());});
  await page.goto(`http://127.0.0.1:${server.address().port}/neo-system/gods-eye/`);
  await page.waitForSelector('#events li');assert.equal(await page.locator('#events li').count(),2);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.match(await page.locator('#state').textContent(),/SIMULATED/);
  await page.locator('#rotation').fill('140');await page.locator('#rotation').dispatchEvent('input');
  assert.equal(await page.locator('#angle').textContent(),'140° E');
  const download=page.waitForEvent('download');await page.locator('#export').click();
  const stream=await (await download).createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);
  const records=JSON.parse(Buffer.concat(chunks).toString());assert.equal(records.length,2);
  for(const record of records){checkRecord(record,schema);assert.equal(record.provenance.state,'simulated');}
  const feedUrl='**/gods-eye/api/earthquakes';
  await page.route(feedUrl,route=>route.fulfill({status:503,contentType:'application/json',body:'{"state":"disabled"}'}));
  await page.locator('#load-feed').click();await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('UNAVAILABLE'));
  assert.equal(await page.locator('#events li').count(),0);assert.equal(await page.locator('#export').isDisabled(),true);
  await page.unroute(feedUrl);
  const now=Date.now();
  const observations=normalizeSnapshot(JSON.stringify({type:'FeatureCollection',metadata:{generated:now},features:[{type:'Feature',id:'test01',geometry:{type:'Point',coordinates:[0,0,0]},properties:{mag:2,time:now}}]}),{now,simulated:false});
  await page.route(feedUrl,route=>route.fulfill({contentType:'application/json',body:JSON.stringify({state:'live',generatedAt:new Date(now).toISOString(),fetchedAt:new Date(now).toISOString(),observations})}));
  await page.locator('#load-feed').click();await page.waitForFunction(()=>document.querySelector('#state').textContent.startsWith('LIVE'));
  assert.equal(await page.locator('#events li').count(),1);
  const realDownload=page.waitForEvent('download');await page.locator('#export').click();
  const realStream=await (await realDownload).createReadStream();const realChunks=[];for await(const chunk of realStream)realChunks.push(chunk);
  const realRecords=JSON.parse(Buffer.concat(realChunks).toString());checkRecord(realRecords[0],schema);assert.equal(realRecords[0].provenance.sourceType,'public-source');
  await page.locator('#demo').click();assert.match(await page.locator('#state').textContent(),/SIMULATED/);
  await page.getByRole('link',{name:'NEO System',exact:true}).click();assert.match(page.url(),/\/neo-system\/$/);
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);await page.close();
 }
 console.log('PASS: built assets, mobile/desktop, rotation, simulated schema-valid export, base-path link, no external requests or page errors');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
