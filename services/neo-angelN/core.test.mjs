import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,writeFile,readFile,symlink,rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { validateConfig,fileCheck,endpointCheck,checkCycle } from './core.mjs';
const config=()=>({version:1,deviceId:'synthetic-host',operator:'synthetic-operator',authorized:true,enabled:true,intervalSeconds:60,timeoutMs:1000,targets:[],integrity:{files:{}}});
test('unenrolled, arbitrary targets, extra capabilities and unbounded intervals are rejected',()=>{
 for(const patch of [{authorized:false},{targets:['https://example.com']},{targets:['__proto__']},{targets:['school','school']},{intervalSeconds:0},{timeoutMs:60000},{remoteCommand:'id'},{integrity:{files:{'../../etc/passwd':'a'.repeat(64)}}}])assert.throws(()=>validateConfig({...config(),...patch}));
 assert.deepEqual(validateConfig(config()),config());
});
test('only a fixed HTTPS GET is issued, with no credentials and no redirects',async()=>{
 let calls=0;const result=await endpointCheck('school',1000,undefined,async(url,options)=>{calls++;assert.equal(url,'https://school.holytemples.org/');assert.equal(options.method,'GET');assert.equal(options.redirect,'manual');assert(!options.headers.Authorization);return new Response('redirect',{status:302});});
 assert.equal(calls,1);assert.equal(result.outcome,'redirect_not_followed');assert.equal(result.applicationHealth,'unverified');await assert.rejects(()=>endpointCheck('unknown',1000));
});
test('transport failures remain unverified and cancellation is distinguished',async()=>{
 const failed=await endpointCheck('prime',1000,undefined,async()=>{throw Error('synthetic')});assert.equal(failed.outcome,'check_failed');const stop=new AbortController();stop.abort();assert.equal((await endpointCheck('prime',1000,stop.signal,async()=>{throw Error('abort')})).outcome,'cancelled');
});
test('baseline comparisons, mismatches, symlinks and scope denial',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'angel-integrity-'));try{await writeFile(join(dir,'core.mjs'),'reviewed source');const digest=createHash('sha256').update('reviewed source').digest('hex');assert.equal((await fileCheck(dir,'core.mjs',digest)).outcome,'baseline_match');assert.equal((await fileCheck(dir,'core.mjs','a'.repeat(64))).outcome,'baseline_mismatch');await symlink(join(dir,'core.mjs'),join(dir,'angelN.mjs'));assert.equal((await fileCheck(dir,'angelN.mjs',digest)).outcome,'unverified');await assert.rejects(()=>fileCheck(dir,'../../etc/passwd',digest));}finally{await rm(dir,{recursive:true,force:true});}
});
test('pause and withdrawn enrollment perform no endpoint calls',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return new Response('ok')};const paused=await checkCycle({...config(),targets:['school'],enabled:false},{root:'.',fetcher});assert.equal(paused.state,'paused');assert.equal(calls,0);await assert.rejects(()=>checkCycle({...config(),authorized:false},{root:'.',fetcher}));assert.equal(calls,0);const empty=await checkCycle(config(),{root:'.',fetcher});assert.equal(empty.integrityConfigured,false);assert.equal(empty.malwareScan,'not-performed');
});
test('real process emits a local observation, persists it and exits on SIGTERM',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'angel-process-'));const root=dirname(fileURLToPath(import.meta.url));let child;try{const cfg=join(dir,'enrollment.json');await writeFile(cfg,JSON.stringify(config()));child=spawn(process.execPath,[join(root,'angelN.mjs'),'--config',cfg,'--state-dir',join(dir,'state')],{stdio:['ignore','pipe','pipe']});let output='',errors='';child.stderr.on('data',x=>errors+=x);const first=new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('No initial observation: '+errors)),5000);child.stdout.on('data',chunk=>{output+=chunk;if(output.includes('\n')){clearTimeout(timeout);resolve();}});child.once('exit',code=>{if(!output.includes('\n')){clearTimeout(timeout);reject(Error('Early exit '+code+': '+errors));}});});await first;const initial=JSON.parse(output.split('\n')[0]);assert.equal(initial.state,'observing');assert.equal(initial.checks.length,0);const saved=JSON.parse(await readFile(join(dir,'state/latest.json'),'utf8'));assert.equal(saved.deviceId,'synthetic-host');const exited=once(child,'exit');child.kill('SIGTERM');const [code,signal]=await exited;assert.equal(code,0);assert.equal(signal,null);assert(output.includes('"state":"stopped"'));}finally{if(child&&child.exitCode===null)child.kill('SIGKILL');await rm(dir,{recursive:true,force:true});}
});
