import test from 'node:test';
import assert from 'node:assert/strict';
import { observe, TARGETS } from '../diagnostics/connect-003-probe.mjs';
import { review, ATTESTATIONS, PHASES } from '../federation/connect-003-review.mjs';

const fakeNow=Date.parse('2026-11-13T23:00:00Z');
const all=()=>({observations:PHASES.map((phase,i)=>({
    schema:'neo.connect.003.local-probe.v1',source:'LOCAL_DEVICE_OBSERVATION',
    observed_at:new Date(fakeNow-10*60_000+i*60_000).toISOString(),
    operator_labeled_phase:phase, target_results:[
      {target_label:'PUBLIC_A',result:'PASS'},{target_label:'PUBLIC_B',result:'PASS'}],
    secret:'DO_NOT_EXPOSE',
  })),attestations:Object.fromEntries(ATTESTATIONS.map(k=>[k,'PASS'])),secret:'DO_NOT_EXPOSE'});

test('single probe only connects to two fixed public domains and reads NetBird startup',async()=>{
  const urls=[],runs=[];
  const got=await observe('wifi_baseline', {
    probe:async url=>{urls.push(url);return 'PASS'},
    run:(cmd,args,opts)=>{runs.push({cmd,args,opts});return {status:0}},
    now:()=>new Date(fakeNow).toISOString(),
  });
  assert.deepEqual(urls,TARGETS);
  assert.deepEqual(runs.map(x=>x.args),[['status','--check','startup']]);
  assert.equal(got.netbird_daemon_startup,'PASS');
  assert.equal(got.failover_verified,false);
  assert.equal(got.encrypted_peer_handshake_verified,false);
  assert.equal(got.phase_and_interface_independently_verified,false);
});

test('an absent local NetBird CLI is not a failed internet connection',async()=>{
  const got=await observe('cellular_backup',{
    probe:async()=> 'PASS',run:()=>({error:{code:'ENOENT'}})
  });
  assert.equal(got.netbird_daemon_startup,'NOT_AVAILABLE');
  assert.ok(got.target_results.every(x=>x.result==='PASS'));
});

test('three healthy self-reported phases are eligible for review, never certified',()=>{
  const got=review(all(),fakeNow);
  assert.equal(got.status,'ELIGIBLE_FOR_INDEPENDENT_MANUAL_REVIEW');
  assert.equal(got.independently_verified,false);
  assert.equal(got.live_failover_certified,false);
  assert.equal(got.production_authorized,false);
  assert.ok(!JSON.stringify(got).includes('DO_NOT_EXPOSE'));
});

test('fail closed if phase is wrong, stale, or a snapshot is missing',()=>{
  const a=all();a.observations[1].operator_labeled_phase='wifi_baseline';
  assert.equal(review(a,fakeNow).status,'HOLD');
  const b=all();b.observations.pop();
  assert.equal(review(b,fakeNow).status,'HOLD');
  const c=all();c.observations[2].observed_at='2026-11-10T00:00:00Z';
  assert.equal(review(c,fakeNow).status,'HOLD');
});

test('a missing permission/ACL/peer check holds even when public HTTPS works',()=>{
  const a=all();a.attestations.unauthorized_private_access_blocked_over_cellular='NOT_TESTED';
  const result=review(a,fakeNow);
  assert.equal(result.status,'HOLD');
  assert.ok(result.flags.some(x=>x.includes('UNAUTHORIZED_PRIVATE_ACCESS')));
  assert.equal(result.live_failover_certified,false);
});

test('failed cellular HTTPS blocks the gate',()=>{
  const a=all();a.observations[1].target_results[0].result='FAIL';
  const result=review(a,fakeNow);
  assert.equal(result.status,'HOLD');
  assert.ok(result.flags.some(x=>x.includes('PUBLIC_CONNECTIVITY_CELLULAR_BACKUP')));
});
