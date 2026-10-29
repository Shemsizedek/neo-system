import https from 'node:https';
import dns from 'node:dns/promises';
import {isPublicIP} from './nomni-secure-fetcher.mjs';
// Fixed provider only. DNS is pinned to the vetted public address for the TLS connection.
const ROOT='https://api.counterparty.io:4000';
export function createNomniCounterpartyTransport({lookup=dns.lookup,maxBytes=262144,timeoutMs=8000}={}){
 if(!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>1048576)throw new TypeError('invalid_max_bytes');
 if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw new TypeError('invalid_timeout');
 return async function fetchJson(input){
  const url=new URL(input);
  if(url.origin!==ROOT||url.username||url.password||url.hash||!/^\/v2\/assets\/NOMNI(?:\/orders)?$/.test(url.pathname))throw new Error('endpoint_not_allowed');
  if(url.pathname.endsWith('/orders')&&url.search!=='?status=open&limit=100')throw new Error('query_not_allowed');
  if(!url.pathname.endsWith('/orders')&&url.search)throw new Error('query_not_allowed');
  const addresses=await lookup(url.hostname,{all:true,verbatim:true});
  if(!Array.isArray(addresses)||addresses.length===0||addresses.some(a=>!isPublicIP(a.address)))throw new Error('unsafe_dns_resolution');
  const selected=addresses[0];
  return new Promise((resolve,reject)=>{
   const req=https.request(url,{method:'GET',timeout:timeoutMs,headers:{accept:'application/json'},lookup:(_host,_opts,cb)=>cb(null,selected.address,selected.family)},res=>{
    if(res.statusCode!==200){res.resume();reject(new Error('upstream_http_error'));return}
    const type=String(res.headers['content-type']||'');
    if(!type.includes('application/json')){res.resume();reject(new Error('invalid_content_type'));return}
    let size=0;const chunks=[];
    res.on('data',b=>{size+=b.length;if(size>maxBytes){res.destroy(new Error('response_too_large'));return}chunks.push(b)});
    res.on('error',reject);res.on('end',()=>{
      try{resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))}catch{reject(new Error('invalid_json'))}
    });
   });
   req.on('timeout',()=>req.destroy(new Error('upstream_timeout')));req.on('error',reject);req.end();
  });
 };
}
