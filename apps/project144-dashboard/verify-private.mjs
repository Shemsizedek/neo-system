#!/usr/bin/env node
// PROJECT144-G006: operator-initiated private deployment smoke verification.
// Never run this against a public production URL; private network route only.
// Usage: COMMAND_URL=https://private-gateway.example.internal COMMAND_USER=... COMMAND_PASSWORD=... node apps/project144-dashboard/verify-private.mjs
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
const origin=process.env.COMMAND_URL;
const user=process.env.COMMAND_USER;
const pass=process.env.COMMAND_PASSWORD;
export async function verifyPrivate({origin,user,pass,fetcher=fetch}={}){
 if(!origin||!user||!pass||pass.length<24)throw Error('Missing target or operator credentials');
 const base=new URL(origin);
 if(base.protocol!=='https:'||base.username||base.password||base.search||base.hash)throw Error('A clean HTTPS private gateway URL is required');
 const auth='Basic '+Buffer.from(user+':'+pass).toString('base64');
 const request=async(path,headers={})=>fetcher(new URL(path,base),{headers,redirect:'manual',signal:AbortSignal.timeout(10000)});
 const unauthenticated=await request('/api/neosync');
 assert.equal(unauthenticated.status,401,'Unauthenticated data must be denied');
 const incorrect=await request('/api/neosync',{Authorization:'Basic '+Buffer.from(user+':wrong').toString('base64')});
 assert.equal(incorrect.status,401,'Incorrect password must be denied');
 const authorized=await request('/api/neosync',{Authorization:auth});
 assert.equal(authorized.status,200,'Authorized status should succeed');
 assert.match(authorized.headers.get('content-type')||'',/application\/json/);
 const json=await authorized.json();
 assert.equal(json.schema,'neo.project144.status.v1');
 assert.ok(Array.isArray(json.git?.referencePaths));
 const dashboard=await request('/',{Authorization:auth});
 assert.equal(dashboard.status,200,'Dashboard HTML should load');
 assert.match(dashboard.headers.get('content-type')||'',/text\/html/);
 const html=await dashboard.text();
 assert.match(html,/project144-dashboard/i);
 return {pass:true,checkedAt:new Date().toISOString(),target:'private gateway',checks:['anonymous denied','wrong password denied','authorized NEOsync data','dashboard HTML served'],referencePaths:json.git.referencePaths.length};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 verifyPrivate({origin,user,pass}).then(result=>{console.log(JSON.stringify(result,null,2));}).catch(err=>{console.error('PRIVATE VERIFICATION FAILED:',err.message);process.exitCode=1;});
}
