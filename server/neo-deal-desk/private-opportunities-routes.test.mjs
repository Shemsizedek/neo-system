import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateOpportunityRoutes} from './private-opportunities-routes.mjs';
const base='/api/v1/deal-desk/private-opportunities';
const headers={cookie:'neo_pass_session=valid-token',origin:'https://desk.holytemples.org','content-type':'application/json'};
const calls=[];
const handler=createPrivateOpportunityRoutes({
 resolveSession:async token=>token==='valid-token'?{authenticated:true,subject:'verified-user',role:'executive-admin',neopassStatus:'active'}:null,
 readService:{list:async({session})=>{calls.push(session.subject);return []},get:async()=>null},
 writeService:{create:async({session,input})=>({id:input.id,actor:session.subject,offering_status:'not_authorized'}),
 changeStage:async({id,stage})=>({id,stage,offering_status:'not_authorized'})}
});
test('rejects missing session',async()=>{const r=await handler({method:'GET',path:base});assert.equal(r.status,401)});
test('rejects forged cookie',async()=>{const r=await handler({method:'GET',path:base,headers:{cookie:'neo_pass_session=forged'}});assert.equal(r.status,403)});
test('rejects cross-origin write',async()=>{const r=await handler({method:'POST',path:base,headers:{...headers,origin:'https://evil.example'},body:{id:'NIBIRU-NC-001'}});assert.equal(r.status,403)});
test('verified cookie reaches the server-side identity',async()=>{const r=await handler({method:'GET',path:base,headers});assert.equal(r.status,200);assert.deepEqual(calls,['verified-user'])});
test('writes leave offering status unapproved',async()=>{const r=await handler({method:'POST',path:base,headers,body:{id:'NIBIRU-NC-001',offering_status:'approved'}});assert.equal(r.status,201);assert.equal(JSON.parse(r.body).item.offering_status,'not_authorized')});
test('rejects unsupported methods and routes',async()=>{assert.equal((await handler({method:'DELETE',path:base,headers})).status,405);assert.equal((await handler({method:'GET',path:base+'/unsafe!id',headers})).status,404)});
