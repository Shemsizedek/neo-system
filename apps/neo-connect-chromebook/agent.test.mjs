import test from 'node:test';
import assert from 'node:assert/strict';
import {createAgent} from './agent.mjs';
test('companion rejects unknown origins and missing tokens',async()=>{
 const agent=createAgent({secret:'x'.repeat(64),run:async()=>({output:'ok',code:0})});
 await new Promise(r=>agent.listen(0,'127.0.0.1',r));
 try{
  const url='http://127.0.0.1:'+agent.address().port+'/command';
  const blocked=await fetch(url,{method:'POST',headers:{origin:'https://attacker.example','x-neo-token':'x'.repeat(64)},body:'{"command":"pwd"}'});
  assert.equal(blocked.status,403);
  const unauthorized=await fetch(url,{method:'POST',headers:{origin:'https://connect.holytemples.org'},body:'{"command":"pwd"}'});
  assert.equal(unauthorized.status,401);
  const allowed=await fetch(url,{method:'POST',headers:{origin:'https://connect.holytemples.org','x-neo-token':'x'.repeat(64)},body:'{"command":"pwd"}'});
  assert.equal(allowed.status,200);
 }finally{await new Promise(r=>agent.close(r))}
});

const canonicalOrigin='https://connect.holytemples.org';
const secret='a'.repeat(64);
async function withAgent(options,check){
 const agent=createAgent({secret,...options});
 await new Promise(resolve=>agent.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+agent.address().port;
 const post=(path,body,headers={})=>fetch(base+path,{method:'POST',headers:{origin:canonicalOrigin,'content-type':'application/json','x-neo-token':secret,...headers},body:JSON.stringify(body)});
 try{await check({base,post})}finally{await new Promise(resolve=>agent.close(resolve))}
}

test('SSH requires the canonical origin and current companion token before executing',async()=>{
 const calls=[];
 await withAgent({ssh:{execute:async request=>{calls.push(request);return {stdout:'remote\n',stderr:'notice\n',exitCode:0}}}},async({post,base})=>{
  const input={hostAlias:'my-server',username:'neo',port:2222,command:'pwd'};
  assert.equal((await post('/ssh/command',input,{origin:'https://attacker.example'})).status,403);
  assert.equal((await post('/ssh/command',input,{'x-neo-token':''})).status,401);
  assert.equal((await post('/ssh/command',input,{'x-neo-token':'b'.repeat(64)})).status,401);
  // Equal character count but a different UTF-8 byte count must not crash comparison.
  assert.equal((await post('/ssh/command',input,{'x-neo-token':'é'.repeat(64)})).status,401);
  assert.equal(calls.length,0);
  const allowed=await post('/ssh/command',input);
  assert.equal(allowed.status,200);
  assert.deepEqual(await allowed.json(),{output:'remote\nnotice\n',code:0});
  assert.deepEqual(calls,[input]);
  const preflight=await fetch(base+'/ssh/command',{method:'OPTIONS',headers:{origin:canonicalOrigin}});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('access-control-allow-private-network'),'true');
 });
});

test('invalid SSH requests never reach the adapter and cannot submit credentials',async()=>{
 let calls=0;
 await withAgent({ssh:{execute:async()=>{calls++;return {stdout:'',stderr:'',exitCode:0}}}},async({post})=>{
  const input={hostAlias:'my-server',command:'pwd'};
  const invalid=[
   [{command:'pwd'},'invalid_host_alias'],
   [{...input,hostAlias:'-remote'},'invalid_host_alias'],
   [{...input,username:'root;evil'},'invalid_username'],
   [{...input,port:70000},'invalid_port'],
   [{...input,port:'22'},'invalid_port'],
   [{...input,command:'x'.repeat(513)},'invalid_command'],
   [{...input,password:'not-accepted'},'invalid_ssh_request'],
   [{...input,privateKey:'not-accepted'},'invalid_ssh_request'],
   [{...input,timeoutMs:60000},'invalid_ssh_request'],
   [null,'invalid_request'],[[],'invalid_request']
  ];
  for(const [body,error] of invalid){
   const response=await post('/ssh/command',body);
   assert.equal(response.status,400);
   assert.deepEqual(await response.json(),{error});
  }
  assert.equal(calls,0);
 });
});

test('SSH service errors return bounded diagnostics without internal exception details',async()=>{
 const errors=[
  [Object.assign(Error('executable detail'),{code:'ENOENT'}),503,'ssh_unavailable'],
  [Error('ssh_timeout'),504,'ssh_timeout'],
  [Error('private internal detail'),502,'ssh_failed']
 ];
 for(const [failure,status,error] of errors){
  await withAgent({ssh:{execute:async()=>{throw failure}}},async({post})=>{
   const response=await post('/ssh/command',{hostAlias:'my-server',command:'pwd'});
   assert.equal(response.status,status);
   assert.deepEqual(await response.json(),{error});
  });
 }
});

test('ordinary SSH authentication or host-verification failure remains visible as a nonzero command exit',async()=>{
 await withAgent({ssh:{execute:async()=>({stdout:'',stderr:'Host key verification failed.\n',exitCode:255})}},async({post})=>{
  const response=await post('/ssh/command',{hostAlias:'my-server',command:'pwd'});
  assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{output:'Host key verification failed.\n',code:255});
 });
});
