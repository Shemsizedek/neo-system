import test from 'node:test';import assert from 'node:assert/strict';
import {isPublicIP,createSecureNomniFetcher} from './nomni-secure-fetcher.mjs';
test('rejects private addresses, link local and mapped loopback',()=>{
 for(const ip of ['127.0.0.1','10.2.3.4','172.16.0.1','192.168.1.2','169.254.169.254','::1','fc00::1','::ffff:127.0.0.1','2001:db8::1'])assert.equal(isPublicIP(ip),false,ip);
 assert.equal(isPublicIP('8.8.8.8'),true);
});
test('robots callback mandatory for network transport',()=>assert.throws(()=>createSecureNomniFetcher(),/robots_policy_required/));
test('rejects hosts without connecting',async()=>{
 const f=createSecureNomniFetcher({robotsAllowed:async()=>true});
 await assert.rejects(()=>f('https://localhost/private'),/unapproved_source_origin/);
 await assert.rejects(()=>f('http://tokenscan.io/asset/NOMNI'),/unapproved_source_origin/);
});
test('blocked robots prevents DNS and requests',async()=>{
 let called=false;
 const f=createSecureNomniFetcher({robotsAllowed:async()=>false,lookup:async()=>{called=true;return []}});
 await assert.rejects(()=>f('https://tokenscan.io/asset/NOMNI'),/robots_disallowed/);
 assert.equal(called,false);
});
test('DNS rejected before request',async()=>{
 const f=createSecureNomniFetcher({robotsAllowed:async()=>true,lookup:async()=>[{address:'127.0.0.1',family:4}]});
 await assert.rejects(()=>f('https://tokenscan.io/asset/NOMNI'),/unsafe_dns_resolution/);
});
