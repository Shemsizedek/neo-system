import test from 'node:test';
import assert from 'node:assert/strict';
import {createNomniScanCrawler} from './nomni-scan-crawler.mjs';
function response(url,text='fixture'){return {ok:true,url,headers:{get:()=>null},text:async()=>text};}
test('approved source is hashed and never certified as a reserve or index value',async()=>{
 const crawler=createNomniScanCrawler({fetcher:async(url)=>response(url),sources:[{id:'nomni-methodology',url:'https://holytemples.org/nomni/',kind:'issuer-methodology'}]});
 const result=await crawler.crawl();
 assert.equal(result.source_results[0].status,'retrieved-unverified');
 assert.match(result.source_results[0].content_sha256,/^[a-f0-9]{64}$/);
 assert.equal(result.index_status,'not_calculated');
 assert.deepEqual(result.constituents.constituents,[]);
});
test('refuses unapproved hosts and credentials',()=>{
 assert.throws(()=>createNomniScanCrawler({fetcher:async()=>{},sources:[{id:'host-test',url:'https://evil.example/x',kind:'issuer-methodology'}]}));
 assert.throws(()=>createNomniScanCrawler({fetcher:async()=>{},sources:[{id:'creds-test',url:'https://a:b@holytemples.org/',kind:'issuer-methodology'}]}));
});
test('redirect, size and upstream failures never turn into verified evidence',async()=>{
 const source=[{id:'nomni-methodology',url:'https://holytemples.org/nomni/',kind:'issuer-methodology'}];
 const x=createNomniScanCrawler({fetcher:async()=>response('https://example.org/redirect'),sources:source});
 assert.equal((await x.crawl()).source_results[0].status,'source-error');
 const y=createNomniScanCrawler({fetcher:async(url)=>response(url,'oversize'),sources:source,maxBytes:3});
 assert.equal((await y.crawl()).source_results[0].error_code,'source_too_large');
});
