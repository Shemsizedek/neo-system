import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';import {createSshAdapter} from './ssh-adapter.mjs';
test('SSH uses verified host keys and no shell interpolation',async()=>{
 let captured;const spawnImpl=(bin,args,opts)=>{captured={bin,args,opts};const p=new EventEmitter();p.stdout=new EventEmitter();p.stderr=new EventEmitter();p.kill=()=>{};queueMicrotask(()=>p.emit('close',0));return p;};
 const result=await createSshAdapter({spawnImpl}).execute({hostAlias:'chromebook',command:'printf hello; whoami'});
 assert.equal(result.exitCode,0);assert.equal(captured.bin,'ssh');assert.equal(captured.opts.shell,false);
 assert.ok(captured.args.includes('StrictHostKeyChecking=yes'));assert.ok(captured.args.includes('BatchMode=yes'));
 assert.equal(captured.args.at(-1),'printf hello; whoami');
});
test('reject unsafe destination and unbounded commands',async()=>{
 const adapter=createSshAdapter();assert.throws(()=>adapter.execute({hostAlias:'host;evil',command:'pwd'}),/invalid_host_alias/);
 assert.throws(()=>adapter.execute({hostAlias:'chromebook',command:'x'.repeat(5000)}),/invalid_command/);
});
