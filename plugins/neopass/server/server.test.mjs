import test from 'node:test';
import assert from 'node:assert/strict';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import {createNeopassMcpServer} from './server.mjs';
const resource='https://neopass.example/mcp',issuer='https://neopass.example';
async function fixture(t){
 let active=true,proof={verified:true,tokenUse:'access',issuer,audience:resource,subject:'canonical-member',expiresAt:3000,assurance:'passkey-user-verified',scopes:['neopass:profile','neopass:services']};const seen=[];
 const server=createNeopassMcpServer({resource,issuer,verifyAccessToken:async token=>token==='valid'?proof:null,isActive:async()=>active,readProfile:async subject=>{seen.push(subject);return {id:'pairwise-member',displayName:'Member',seed:'NEVER RETURN',email:'private'};},readServices:async subject=>{seen.push(subject);return [{id:'gisd',name:'GISD',privateRecord:'NEVER RETURN'}];},now:()=>2000});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;const clients=[];
 t.after(async()=>{for(const c of clients)await c.close();await new Promise(r=>server.close(r));});
 async function client(token){const c=new Client({name:'integration-test',version:'1.0.0'});const transport=new StreamableHTTPClientTransport(new URL(base+'/mcp'),{requestInit:{headers:token?{Authorization:'Bearer '+token}:{}}});await c.connect(transport);clients.push(c);return c;}
 return {base,client,seen,change(delta){proof={...proof,...delta};},disable(){active=false;}};
}
test('actual MCP SDK handshake, protected metadata and read-only tools',async t=>{
 const f=await fixture(t),client=await f.client('valid');
 assert.equal((await (await fetch(f.base+'/.well-known/oauth-protected-resource')).json()).resource,resource);
 const tools=(await client.listTools()).tools;assert.equal(tools.length,2);assert.ok(tools.every(tool=>tool.annotations.readOnlyHint));
 const profile=await client.callTool({name:'neopass_account',arguments:{}});assert.deepEqual(profile.structuredContent,{id:'pairwise-member',displayName:'Member'});assert.equal(JSON.stringify(profile).includes('NEVER RETURN'),false);
 const services=await client.callTool({name:'neopass_services',arguments:{}});assert.deepEqual(services.structuredContent,{services:[{id:'gisd',name:'GISD'}]});assert.deepEqual(f.seen,['canonical-member','canonical-member']);
});
test('anonymous access triggers OAuth; token audience, type, scope and account revocation fail closed',async t=>{
 const f=await fixture(t),anon=await f.client();let result=await anon.callTool({name:'neopass_account',arguments:{}});assert.ok(result._meta['mcp/www_authenticate'][0].includes('resource_metadata='));assert.equal(f.seen.length,0);
 const client=await f.client('valid');for(const delta of [{audience:'https://other.example/mcp'},{issuer:'https://other.example'},{tokenUse:'id'},{expiresAt:1000},{verified:false},{assurance:'google'},{scopes:[]}]){
  const reset={verified:true,tokenUse:'access',issuer,audience:resource,expiresAt:3000,assurance:'passkey-user-verified',scopes:['neopass:profile']};f.change({...reset,...delta});result=await client.callTool({name:'neopass_account',arguments:{}});assert.equal(result.isError,true);
 }
 assert.equal(f.seen.length,0);f.change({scopes:['neopass:profile']});f.disable();assert.equal((await client.callTool({name:'neopass_account',arguments:{}})).isError,true);
});
test('model-provided account IDs, wallet actions and foreign origin requests are rejected',async t=>{
 const f=await fixture(t),client=await f.client('valid');
 for(const input of [{name:'neopass_account',arguments:{subject:'admin'}},{name:'unlock_wallet',arguments:{}}])assert.equal((await client.callTool(input)).isError,true);
 assert.equal(f.seen.length,0);assert.equal((await fetch(f.base+'/mcp',{method:'POST',headers:{origin:'https://evil.example'}})).status,403);
});
