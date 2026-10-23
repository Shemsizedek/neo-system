import {createHash} from 'node:crypto';
import {publicConstituentPayload} from './nomni-constituent-adapter.mjs';

export const NOMNI_CRAWLER_VERSION='nomni.scan-crawler.v0.1';
const DEFAULT_SOURCES=Object.freeze([
 {id:'tokenscan-nomni',url:'https://tokenscan.io/asset/NOMNI',kind:'counterparty-asset-reference'},
 {id:'nomni-methodology',url:'https://holytemples.org/nomni/',kind:'issuer-methodology'}
]);
function validateSource(source,hosts){
 if(!source || typeof source.id!=='string' || !/^[a-z0-9-]{3,64}$/.test(source.id))throw new TypeError('invalid_source_id');
 const url=new URL(source.url);
 if(url.protocol!=='https:' || url.username || url.password || url.port || !hosts.includes(url.hostname.toLowerCase()))throw new TypeError('unapproved_source_origin');
 if(!['counterparty-asset-reference','issuer-methodology'].includes(source.kind))throw new TypeError('invalid_source_kind');
 return {id:source.id,url:url.href,kind:source.kind};
}
export function createNomniScanCrawler({fetcher,allowedHosts=['tokenscan.io','holytemples.org'],maxBytes=262144,sources=DEFAULT_SOURCES}={}){
 if(typeof fetcher!=='function')throw new TypeError('fetcher_required');
 if(!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>1048576)throw new TypeError('invalid_max_bytes');
 const hosts=allowedHosts.map(s=>String(s).toLowerCase());
 const registry=sources.map(s=>validateSource(s,hosts));
 if(new Set(registry.map(x=>x.id)).size!==registry.length)throw new Error('duplicate_source_id');
 async function crawl(){
  const results=[];
  for(const source of registry){
   try{
    // Caller is responsible for transport-level DNS/IP SSRF protection, robots.txt compliance and redirect disabling.
    const response=await fetcher(source.url,{redirect:'error',method:'GET',headers:{accept:'text/html,application/json'}});
    if(!response || !response.ok)throw new Error('source_http_error');
    const finalUrl=new URL(response.url||source.url);
    if(finalUrl.href!==source.url)throw new Error('redirect_not_allowed');
    const declaredLength=Number(response.headers?.get?.('content-length')||0);
    if(declaredLength>maxBytes)throw new Error('source_too_large');
    const body=await response.text();
    if(Buffer.byteLength(body,'utf8')>maxBytes)throw new Error('source_too_large');
    results.push({source_id:source.id,source_url:source.url,source_kind:source.kind,
      fetched_at:new Date().toISOString(),content_sha256:createHash('sha256').update(body).digest('hex'),
      observed_bytes:Buffer.byteLength(body,'utf8'),status:'retrieved-unverified',
      claim_status:'no-independent-reserve-or-market-verification'});
   }catch(error){results.push({source_id:source.id,source_url:source.url,status:'source-error',
      error_code:['redirect_not_allowed','source_too_large'].includes(error.message)?error.message:'source_unavailable'});}
  }
  return {schema_version:NOMNI_CRAWLER_VERSION,read_only:true,index_status:'not_calculated',source_results:results,
    constituents:publicConstituentPayload([]),notes:'Source retrieval proves neither on-chain validation nor off-chain asset ownership, pricing or reserve status.'};
 }
 return Object.freeze({crawl,sourceRegistry:()=>registry.map(x=>({...x}))});
}
