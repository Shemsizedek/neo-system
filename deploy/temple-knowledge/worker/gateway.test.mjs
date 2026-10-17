import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const {createGateway}=await import('../dist/server/index.js');
const content=JSON.parse(fs.readFileSync(new URL('./public-content.json',import.meta.url)));const worker=createGateway(content);
const request=(host,path='/',options={})=>new Request('https://'+host+'.holytemples.org'+path,options);
async function get(host,path='/'){return worker.fetch(request(host,path));}
test('all five frontends and every referenced local asset return real content',async()=>{
 for(const [host,marker] of [['noogle','Noogle — Search Public Knowledge'],['omnitrix','Omnitrix'],['oracle','NEO ORACLE'],['algo','Run Model'],['book','NEO Books']]){
  const page=await get(host);assert.equal(page.status,200);const html=await page.text();assert.ok(html.includes(marker),host);
  for(const match of html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css|png|svg|json))['"]/g)){
   const url=new URL(match[1],'https://'+host+'.holytemples.org/');if(url.hostname!==host+'.holytemples.org')continue;
   const asset=await worker.fetch(new Request(url));assert.equal(asset.status,200,url.href);assert.ok((await asset.arrayBuffer()).byteLength>0,url.href);assert.ok(!asset.headers.get('content-type').includes('text/html'),url.href);
  }
  const head=await worker.fetch(request(host,'/',{method:'HEAD'}));assert.equal(head.status,200);assert.equal(await head.text(),'');
 }
 assert.equal((await get('noogle','/missing.js')).status,404);
});
test('public API routes and GitHub Pages aliases resolve without private data',async()=>{
 for(const path of ['/api/noogle/index.json','/neo-system/api/noogle/index.json']){
  const r=await get('noogle',path);assert.equal(r.status,200);const index=await r.json();assert.equal(index.documents.length,4);assert.ok(index.documents.every(d=>d.sourceClass==='PUBLIC_WORLD_LIBRARY'));
 }
 const schema=await (await get('book','/api/platforms/neo-books.json')).json();assert.equal(schema.scope,'public-metadata-only');
 const graph=await (await get('noogle','/api/noogle/knowledge-graph.json')).json();assert.equal(graph.edges.length,0);
 for(const host of ['noogle','omnitrix','oracle','algo','book']){assert.equal((await get(host,'/api/accounts')).status,503);assert.equal((await worker.fetch(request(host,'/',{method:'POST',body:'private'}))).status,503);}
});
test('search and navigation retain canonical domains and query strings',async()=>{
 const result=await get('oracle','/noogle/?q=public%20library');assert.equal(result.headers.get('location'),'https://noogle.holytemples.org/?q=public%20library');
 assert.equal((await get('algo','/neo-hub/')).headers.get('location'),'https://hub.holytemples.org/');
 const page=await (await get('oracle')).text();assert.ok(page.includes('https://noogle.holytemples.org/?q='));
});
test('public catalog search returns a known record when external search returns no results',async()=>{
 const index=JSON.parse(content.files['api/noogle/index.json'].body);const window={searchKnowledge:async()=>({items:[],failures:3})};
 const context=vm.createContext({window,URL,location:{href:'https://noogle.holytemples.org/'},fetch:async()=>new Response(JSON.stringify(index)),console});
 vm.runInContext(content.files['noogle/native-search.js'].body,context);
 const results=await window.searchKnowledge('NEO Codex');assert.ok(results.items.some(item=>item.title.includes('Codex')));assert.equal(results.nativeFirst,true);assert.equal(results.failures,3);
});
test('Algo model and Oracle search handoff run with migrated links',async()=>{
 const algo=content.files['neo-algo/index.html'].body.match(/<script>([\s\S]*?)<\/script>/)[1];
 const context=vm.createContext({base:{value:'1000'},rate:{value:'0.09'},cycles:{value:'12'},total:{},Intl,Math,claim:{value:''},analysis:{}});vm.runInContext(algo,context);assert.equal(context.total.textContent,new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(1000*Math.pow(1.0009,12)));
 const oracle=content.files['neo-oracle/index.html'].body.match(/<script>([\s\S]*?)<\/script>/)[1];const location={};const q={value:'public library'};const env=vm.createContext({location,document:{getElementById:()=>q},encodeURIComponent});vm.runInContext(oracle+';send()',env);assert.equal(location.href,'https://noogle.holytemples.org/?q=public%20library');
});
test('Omnitrix service worker excludes API calls, credentials and external requests',()=>{
 const listeners={};const self={registration:{scope:'https://omnitrix.holytemples.org/'},addEventListener:(name,listener)=>listeners[name]=listener};vm.runInNewContext(content.files['omnitrix/sw.js'].body,{self,URL,Set,Response});
 for(const [url,headers] of [['https://omnitrix.holytemples.org/api/account',{}],['https://miner.example/status',{}],['https://omnitrix.holytemples.org/app.js',{authorization:'Bearer private'}]]){
  let handled=false;listeners.fetch({request:new Request(url,{headers}),respondWith:()=>handled=true});assert.equal(handled,false);
 }
});
test('every packaged JavaScript file parses before publication',()=>{
 for(const [path,file] of Object.entries(content.files))if(path.endsWith('.js'))assert.doesNotThrow(()=>new vm.Script(file.body,{filename:path}),path);
});
