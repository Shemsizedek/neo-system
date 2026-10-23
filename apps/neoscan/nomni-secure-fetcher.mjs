import https from 'node:https';
import dns from 'node:dns/promises';
import net from 'node:net';

const APPROVED_HOSTS=new Set(['tokenscan.io','holytemples.org']);
function publicIPv4(ip){
 const n=ip.split('.').map(Number);if(n.length!==4||n.some(x=>!Number.isInteger(x)||x<0||x>255))return false;
 const [a,b]=n;
 return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127||a===192&&b===0||a===198&&(b===18||b===19)||a===198&&b===51||a===203&&b===0);
}
export function isPublicIP(ip){
 if(net.isIP(ip)===4)return publicIPv4(ip);
 if(net.isIP(ip)!==6)return false;
 const lc=ip.toLowerCase();
 if(lc.startsWith('::ffff:'))return publicIPv4(lc.slice(7));
 // Conservative global-unicast IPv6 gate, excludes ULA/link-local/loopback/documentation.
 if(!/^[23][0-9a-f]{0,3}:/.test(lc))return false;
 if(lc.startsWith('2001:db8:')||lc.startsWith('2001:0:'))return false;
 return true;
}
export function createSecureNomniFetcher({lookup=dns.lookup,robotsAllowed,timeoutMs=8000,maxBytes=262144}={}){
 if(typeof robotsAllowed!=='function')throw new TypeError('robots_policy_required');
 if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw new TypeError('invalid_timeout');
 if(!Number.isInteger(maxBytes)||maxBytes<1||maxBytes>1048576)throw new TypeError('invalid_max_bytes');
 return async function fetchVerifiedSource(input){
  const url=new URL(input);
  if(url.protocol!=='https:'||url.username||url.password||url.port||!APPROVED_HOSTS.has(url.hostname.toLowerCase()))throw new Error('unapproved_source_origin');
  if(!(await robotsAllowed(url.href)))throw new Error('robots_disallowed');
  const addresses=await lookup(url.hostname,{all:true,verbatim:true});
  if(!Array.isArray(addresses)||!addresses.length||addresses.some(a=>!isPublicIP(a.address)))throw new Error('unsafe_dns_resolution');
  const selected=addresses[0];
  return new Promise((resolve,reject)=>{
   const req=https.request(url,{method:'GET',timeout:timeoutMs,maxRedirects:0,headers:{accept:'text/html,application/json','user-agent':'NEOScanResearchCrawler/0.1 (+https://holytemples.org/nomni/)'},lookup:(_hostname,_opts,cb)=>cb(null,selected.address,selected.family)},res=>{
    if((res.statusCode||0)>=300&&(res.statusCode||0)<400){res.resume();reject(new Error('redirect_not_allowed'));return}
    if(res.statusCode!==200){res.resume();reject(new Error('source_http_error'));return}
    const declared=Number(res.headers['content-length']||0);
    if(declared>maxBytes){res.destroy();reject(new Error('source_too_large'));return}
    let size=0;const chunks=[];
    res.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){res.destroy(new Error('source_too_large'));return}chunks.push(chunk)});
    res.on('error',reject);
    res.on('end',()=>resolve({ok:true,url:url.href,headers:{get:key=>res.headers[String(key).toLowerCase()]??null},text:async()=>Buffer.concat(chunks).toString('utf8')}));
   });
   req.on('timeout',()=>req.destroy(new Error('source_timeout')));req.on('error',reject);req.end();
  });
 };
}
