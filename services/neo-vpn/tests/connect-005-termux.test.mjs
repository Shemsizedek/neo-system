import test from 'node:test';
import assert from 'node:assert/strict';
import { assess, classifyStorage, snapshotStorage, TARGETS } from '../diagnostics/connect-005-termux.mjs';

const env = { HOME:'/data/data/com.termux/files/home',PREFIX:'/data/data/com.termux/files/usr', TERMUX_VERSION:'0.118' };
const gb = (totalGiB,availGiB) => ({
  blocks: BigInt(totalGiB) * 1024n * 1024n,
  bavail: BigInt(availGiB) * 1024n * 1024n,
  bsize: 1024n,
});
test('Android system root at 100% is not misinterpreted as Termux home capacity', async () => {
  const seen=[];
  const report=await assess({env, node:'26.3.1',
    getStat:p=>{seen.push(p);return gb(32,20)},
    probe:async()=> 'PASS',now:()=> '2026-11-14T04:27:00Z'});
  assert.deepEqual(seen,[env.HOME,env.PREFIX]);
  assert.equal(report.status,'PHONE_HTTPS_REACHABLE');
  assert.equal(report.storage.termux_home.class,'OK');
  assert.equal(report.root_filesystem_assessed,false);
  assert.equal(report.remote_crown_node_verified,false);
  assert.equal(report.netbird_wireguard_handshake_verified,false);
});
test('data filesystem low and critical thresholds are distinct', () => {
  assert.equal(classifyStorage({blocks:100000n,bavail:2n,bsize:4096n}).class,'CRITICAL');
  assert.equal(classifyStorage({blocks:1000000n,bavail:100000n,bsize:4096n}).class,'LOW');
  assert.equal(classifyStorage(gb(32,20)).class,'OK');
  assert.equal(classifyStorage({blocks:0,bavail:0,bsize:0}).class,'UNKNOWN');
});
test('offline mode never probes the network or certifies phone internet', async()=>{
  const report=await assess({env,offline:true,getStat:()=>gb(10,4),
    probe:()=>{throw new Error('Should not probe')},now:()=> '2026-11-14T04:27:00Z'});
  assert.equal(report.status,'OFFLINE_CHECK_ONLY');
  assert.deepEqual(report.https,[]);
  assert.equal(report.cellular_failover_verified,false);
});
test('only two approved HTTPS hosts are tested; no raw network output is emitted',async()=>{
  const called=[];
  const report=await assess({env, getStat:()=>gb(10,4),
    probe:async url=>{called.push(url);return 'PASS'},
    now:()=> '2026-11-14T04:27:00Z'});
  assert.deepEqual(called,TARGETS.map(x=>x.url));
  const result=JSON.stringify(report);
  for(const value of [env.HOME,env.PREFIX,'192.0.2.99','SSID','key=']) {
    assert.ok(!result.includes(value));
  }
});
test('HTTPS failure cannot be described as reachable',async()=>{
  const report=await assess({env, getStat:()=>gb(10,4),probe:async url=>
    url.includes('sentinelx') ? 'FAIL':'PASS',now:()=> '2026-11-14T04:27:00Z'});
  assert.equal(report.status,'PHONE_HTTPS_NOT_CONFIRMED');
  assert.ok(report.flags.includes('HTTPS_PATH_REQUIRES_REVIEW'));
});
test('inaccessible storage is unknown, not full or okay',()=>{
  assert.equal(snapshotStorage('/not-real',()=>{throw Error('EACCES')}).class,'UNAVAILABLE');
  assert.equal(snapshotStorage('',()=>gb(10,3)).class,'UNAVAILABLE');
});
