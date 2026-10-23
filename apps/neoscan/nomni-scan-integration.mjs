import {createNomniScanCrawler} from './nomni-scan-crawler.mjs';
import {createCounterpartyObservationAdapter} from './nomni-counterparty-observation.mjs';
const API_ORIGIN='https://api.counterparty.io:4000';
export function createNomniScanIntegration({publicSourceFetcher,counterpartyJsonFetcher,robotsAllowed}={}){
 if(typeof publicSourceFetcher!=='function'||typeof counterpartyJsonFetcher!=='function'||typeof robotsAllowed!=='function')throw new TypeError('verified_transport_and_robots_required');
 const crawler=createNomniScanCrawler({fetcher:async(url,options)=>{
   if(!(await robotsAllowed(url)))throw new Error('robots_disallowed');
   return publicSourceFetcher(url,options);
 }});
 const counterparty=createCounterpartyObservationAdapter({fetchJson:async(url)=>{
   const parsed=new URL(url);
   if(parsed.origin!==API_ORIGIN || !/^\/v2\/assets\/[A-Z0-9_.]+$/.test(parsed.pathname) || parsed.search || parsed.hash)throw new Error('counterparty_endpoint_not_allowed');
   // The injected transport must enforce TLS, DNS rebinding/SSRF defenses, timeouts and byte limits.
   return counterpartyJsonFetcher(parsed.href,{method:'GET',redirect:'error',headers:{accept:'application/json'}});
 }});
 return Object.freeze({async snapshot({includeSourceCrawl=false}={}){
   const observation=await counterparty.observe('NOMNI');
   const sourceCrawl=includeSourceCrawl?await crawler.crawl():null;
   return {schema_version:'nomni.scan.integration.v0.1',asset:'NOMNI',counterparty_observation:observation,source_crawl:sourceCrawl,
    verified_index_level:null,reserve_evidence_status:'not_verified',publication_status:'review_only'};
 }});
}
