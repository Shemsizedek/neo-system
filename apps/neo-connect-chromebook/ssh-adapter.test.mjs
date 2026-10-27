import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';import {createSshAdapter} from './ssh-adapter.mjs';
test('SSH uses verified host keys and no shell interpolation',async()=>{
 let captured;const spawnImpl=(bin,args,opts)=>{captured={bin,args,opts};const p=new EventEmitter();p.stdout=new EventEmitter();p.stderr=new EventEmitter();p.kill=()=>{};queueMicrotask(()=>p.emit('close',0));return p;};
 const result=await createSshAdapter({spawnImpl}).execute({hostAlias:'chromebook',command:'printf hello; whoami'});
 assert.equal(result.exitCode,0);assert.equal(captured.bin,'ssh');assert.equal(captured.opts.shell,false);
 assert.ok(captured.args.includes('StrictHostKeyChecking=yes'));assert.ok(captured.args.includes('BatchMode=yes'));
 assert.ok(captured.args.includes('ForwardAgent=no'));assert.ok(captured.args.includes('ClearAllForwardings=yes'));
 assert.ok(captured.args.includes('RequestTTY=no'));
 assert.equal(captured.args.at(-1),'printf hello; whoami');
});

test('SSH target options use separate arguments and otherwise preserve local config defaults',async()=>{
 const captures=[];
 const spawnImpl=(bin,args,opts)=>{
  captures.push({bin,args,opts});
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
  queueMicrotask(()=>{child.stdout.emit('data',Buffer.from('remote-home\n'));child.stderr.emit('data',Buffer.from('notice\n'));child.emit('close',0)});
  return child;
 };
 const adapter=createSshAdapter({spawnImpl});
 assert.deepEqual(await adapter.execute({hostAlias:'server.example.org',username:'neo-user',port:2222,command:'pwd'}),{stdout:'remote-home\n',stderr:'notice\n',exitCode:0});
 const args=captures[0].args;
 assert.deepEqual(args.slice(-7),['-l','neo-user','-p','2222','--','server.example.org','pwd']);
 await adapter.execute({hostAlias:'my-server',command:'pwd'});
 assert.ok(!captures[1].args.includes('-l'));
 assert.ok(!captures[1].args.includes('-p'));
 assert.equal(captures[1].opts.stdio[0],'ignore');
});

test('invalid SSH target settings never start an SSH process',()=>{
 let spawned=0;
 const adapter=createSshAdapter({spawnImpl:()=>{spawned++;throw Error('must_not_spawn')}});
 const input={hostAlias:'remote',command:'pwd'};
 for(const hostAlias of ['', '-oProxyCommand=evil', 'user@host', 'host;evil', 'host\nother', 'x'.repeat(254)]) {
  assert.throws(()=>adapter.execute({...input,hostAlias}),/invalid_host_alias/);
 }
 for(const username of ['', '-root', 'neo;evil', 'neo user', 'x'.repeat(65), null]) {
  assert.throws(()=>adapter.execute({...input,username}),/invalid_username/);
 }
 for(const port of [0,65536,22.5,'22',null])assert.throws(()=>adapter.execute({...input,port}),/invalid_port/);
 for(const timeoutMs of [0,999,60001,'1000'])assert.throws(()=>adapter.execute({...input,timeoutMs}),/invalid_timeout/);
 for(const command of ['', '  ', 'x'.repeat(4097), null])assert.throws(()=>adapter.execute({...input,command}),/invalid_command/);
 assert.equal(spawned,0);
});

test('SSH propagates unavailable executable and bounds process output',async()=>{
 const missing=createSshAdapter({spawnImpl:()=>{
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
  queueMicrotask(()=>child.emit('error',Object.assign(Error('not installed'),{code:'ENOENT'})));
  return child;
 }});
 await assert.rejects(missing.execute({hostAlias:'remote',command:'pwd'}),{code:'ENOENT'});
 const adapter=createSshAdapter({spawnImpl:()=>{
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
  queueMicrotask(()=>{child.stdout.emit('data',Buffer.alloc(70000,'x'));child.stderr.emit('data',Buffer.alloc(70000,'y'));child.emit('close',255)});
  return child;
 }});
 const result=await adapter.execute({hostAlias:'remote',command:'pwd'});
 assert.equal(result.stdout.length,65536);assert.equal(result.stderr.length,65536);assert.equal(result.exitCode,255);
});

test('SSH timeout kills its process and rejects rather than reporting successful execution',async()=>{
 let killed;
 const adapter=createSshAdapter({spawnImpl:()=>{
  const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=signal=>{killed=signal;};
  return child;
 }});
 await assert.rejects(adapter.execute({hostAlias:'remote',command:'sleep 10',timeoutMs:1000}),/ssh_timeout/);
 assert.equal(killed,'SIGKILL');
});
test('reject unsafe destination and unbounded commands',async()=>{
 const adapter=createSshAdapter();assert.throws(()=>adapter.execute({hostAlias:'host;evil',command:'pwd'}),/invalid_host_alias/);
 assert.throws(()=>adapter.execute({hostAlias:'chromebook',command:'x'.repeat(5000)}),/invalid_command/);
});
