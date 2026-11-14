import test from 'node:test';
import assert from 'node:assert/strict';
import { observeHost } from '../diagnostics/connect-004-host-readiness.mjs';

const disk = ['Filesystem 1024-blocks Used Available Capacity Mounted on',
'/dev/loop0 10000 5000 5000 50% /', ''].join('\n');
function fakeRun(commands, {diskLine=disk,agentUp=true,enabled=true,netbirdUp=true}={}) {
  return (bin,args,options) => {
    commands.push([bin,...args]);
    assert.equal(options.shell,false);
    if (bin==='df') return {status:0,stdout:diskLine};
    if (bin==='systemctl') {
      const isActive=args[0]==='is-active';
      const isAgent=args.at(-1)==='sentinelx-cloud-core';
      return {status:isAgent ? (isActive?Number(!agentUp):Number(!enabled)) : Number(!netbirdUp),stdout:''};
    }
    throw new Error('Unexpected tool invocation');
  };
}
const now=()=> '2026-11-13T23:00:00Z';

test('all local prerequisites still do not declare a live host or VPN',async()=>{
  const calls=[];
  const output=await observeHost({
    run:fakeRun(calls),resolveDns:async()=>({address:'PRIVATE_IP_NEVER_PRINT'}),
    connectTls:async(host)=> {assert.equal(host,'mcp.sentinelx.app');return 'PASS'},now,
  });
  assert.equal(output.status,'LOCAL_PRECHECK_PASS_REMOTE_CONFIRMATION_REQUIRED');
  assert.equal(output.sentinelx_cloud_connection_verified,false);
  assert.equal(output.wireguard_handshake_verified,false);
  assert.equal(output.private_application_traffic_verified,false);
  assert.equal(output.production_authorized,false);
  assert.ok(!JSON.stringify(output).includes('PRIVATE_IP_NEVER_PRINT'));
  assert.equal(calls.length,4);
  assert.ok(calls.every(x=>x[0]==='systemctl'||x[0]==='df'));
});

test('agent service down blocks approval',async()=>{
  const result=await observeHost({
    run:fakeRun([],{agentUp:false}),resolveDns:async()=>({address:'127.0.0.1'}),
    connectTls:async()=> 'PASS',now,
  });
  assert.equal(result.status,'HOLD');
  assert.ok(result.flags.includes('SENTINELX_AGENT_NOT_CONFIRMED_ACTIVE'));
});

test('offline-only mode makes no network probes and holds',async()=>{
  const r=await observeHost({run:fakeRun([]), offline:true,
    resolveDns:()=>{throw Error('no dns permitted')},
    connectTls:()=>{throw Error('no tls permitted')}, now});
  assert.equal(r.sentinelx_dns_resolution,'NOT_TESTED');
  assert.equal(r.sentinelx_outbound_tls_443,'NOT_TESTED');
  assert.equal(r.status,'HOLD');
});

test('DNS failure prevents outbound connection and blocks gate',async()=>{
  const result=await observeHost({run:fakeRun([]),
    resolveDns:async()=>{throw Error('lookup failed')},
    connectTls:()=>{throw Error('TLS should not be attempted')},now});
  assert.equal(result.status,'HOLD');
  assert.equal(result.sentinelx_dns_resolution,'FAIL');
  assert.equal(result.sentinelx_outbound_tls_443,'NOT_TESTED');
});

test('critical disk usage blocks even when service and network appear healthy',async()=>{
  const result=await observeHost({run:fakeRun([],{diskLine:'Filesystem Used Available Use% Mounted\n/dev/sda 100 99 1 99% /\n'}),
    resolveDns:async()=>({address:'192.0.2.1'}),connectTls:async()=> 'PASS',now});
  assert.equal(result.root_disk_usage_class,'CRITICAL');
  assert.equal(result.status,'HOLD');
});

test('result does not expose commands output, keys or endpoint details',async()=>{
  const data='PRIVATE_KEY=DO_NOT_COPY /home/operator 203.0.113.99';
  const run=(_cmd,args)=>args[0]==='-P'?
    {status:0,stdout:'Filesystem Used Avail Use% Mount\n/dev/sda 1 1 1 40% /\n'+data} :
    {status:0,stdout:data};
  const result=await observeHost({run,resolveDns:async()=>({address:data}),
    connectTls:async()=> 'PASS',now});
  const rendered=JSON.stringify(result);
  assert.ok(!rendered.includes(data));
  assert.ok(!rendered.includes('203.0.113.99'));
  assert.ok(!rendered.includes('/home/operator'));
});
