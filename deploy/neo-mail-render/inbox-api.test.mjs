import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createInboxHandler} from './inbox-api.mjs';
const call=async(handler,authorization,method='GET')=>{
 let status,body;
 const res={writeHead:(s)=>{status=s},end:(s)=>{body=JSON.parse(s)}};
 await handler({method,headers:{authorization}},res);
 return {status,body};
};
test('no runtime never reveals inbox',async()=>{
 assert.equal((await call(createInboxHandler(),null)).status,503);
});
test('even enabled routes require bearer and independently verified identity',async()=>{
 const handler=createInboxHandler({enabled:true,mailbox:'chaplain@holytemples.org',verifyIdentity:async()=>null,router:{readInbox:async()=>{throw Error('must not run')}}});
 assert.equal((await call(handler,null)).status,401);
 assert.equal((await call(handler,'Bearer abc')).status,401);
 assert.equal((await call(handler,'Bearer '+ 'a'.repeat(25))).status,403);
});
test('valid verified principal reads only scoped mailbox',async()=>{
 let called=0;
 const router={
 verifyIdentity:async()=>({verified:true,subject:'member-1',mailbox:'chaplain@holytemples.org'}),
 readInbox:async req=>{called++;assert.equal(req.grant.mailbox,'chaplain@holytemples.org');return {ok:true,messages:[{uid:1}]}}
 };
 const handler=createInboxHandler({enabled:true,mailbox:'chaplain@holytemples.org',router,verifyIdentity:async()=>({verified:true,subject:'member-1',mailbox:'chaplain@holytemples.org'})});
 assert.deepEqual((await call(handler,'Bearer '+ 'a'.repeat(25))),{status:200,body:{messages:[{uid:1}]}});
 assert.equal(called,1);
});
