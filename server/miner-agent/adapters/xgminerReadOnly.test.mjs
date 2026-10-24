import test from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import {once} from 'node:events';
import {createXgminerReadOnlyClient} from './xgminerReadOnly.mjs';

// These tests simulate the documented TCP wire format. No miner or hashing is started.
const good=(section,rows)=>({STATUS:[{STATUS:'S'}],[section]:rows,id:1});
const defaults={version:good('VERSION',[{CGMiner:'fixture',API:'3.7'}]),
  summary:good('SUMMARY',[{'MHS av':120000000,Accepted:20,Rejected:1}]),
  devs:good('DEVS',[{Temperature:60,Serial:'private-serial'}]),
  pools:good('POOLS',[{Status:'Alive',URL:'private-pool',User:'private-worker',Password:'private-password'}])};
async function socketFixture(fn,{reply=(_command)=>JSON.stringify(defaults[_command])+'\0',timeoutMs=300,maxBytes=262144}={}){
  const calls=[],sockets=new Set();
  const server=net.createServer(socket=>{
    sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});
    socket.once('data',data=>{const request=JSON.parse(data.toString());calls.push(request);
      const body=reply(request.command);if(body!==null)socket.end(body);});
  }).listen(0,'127.0.0.1');
  await once(server,'listening');
  const client=createXgminerReadOnlyClient({enabled:true,operatorConsent:true,port:server.address().port,timeoutMs,maxBytes});
  try{return await fn(client,calls);}finally{for(const socket of sockets)socket.destroy();await new Promise(r=>server.close(r));}
}
test('defaults cannot connect; public/LAN/DNS hosts and unsafe limits are denied',()=>{
  assert.throws(()=>createXgminerReadOnlyClient(),/OPT_IN/);
  for(const host of ['10.0.0.1','192.168.1.2','8.8.8.8','localhost','example.com','::ffff:127.0.0.1'])
    assert.throws(()=>createXgminerReadOnlyClient({enabled:true,operatorConsent:true,host}),/LOOPBACK/);
  assert.throws(()=>createXgminerReadOnlyClient({enabled:true,operatorConsent:true,timeoutMs:0}),/BOUNDS/);
});
test('only fixed read commands are sent; no mutation, combined command or arbitrary parameters',()=>socketFixture(async(client,calls)=>{
  for(const command of ['restart','quit','switchpool','summary+quit','summary|0','devset',{},null])
    await assert.rejects(()=>client.query(command),/READ_COMMAND_DENIED/);
  assert.equal(calls.length,0);
  await client.query('summary');assert.deepEqual(calls,[{command:'summary'}]);
}));
test('CGMiner observation is unit-normalized, private-field-redacted and never trusted capacity',()=>socketFixture(async(client)=>{
  const result=await client.readTelemetry();assert.equal(result.reportedHashrateTh,120);
  assert.equal(result.source,'CGMINER');assert.equal(result.powerW,null);
  assert.equal(result.reportedAcceptedShares,20);assert.equal(result.acceptedSharesVerified,false);
  assert.equal(result.contractCapacityEligible,false);assert.equal(result.hardwareVerified,false);
  assert.equal(result.temperatureC,60);assert.equal(JSON.stringify(result).includes('private-'),false);
}));
test('BFGMiner GHS report is supported without inferring missing counters',()=>socketFixture(async client=>{
  const result=await client.readTelemetry();assert.equal(result.source,'BFGMINER');
  assert.equal(result.reportedHashrateTh,2);assert.equal(result.reportedAcceptedShares,null);
},{reply:command=>JSON.stringify(command==='version'?good('VERSION',[{BFGMiner:'fixture'}]):
  command==='summary'?good('SUMMARY',[{'GHS 5s':2000}]):defaults[command])}));
for(const [label,reply,options,pattern] of [
  ['API error',()=>JSON.stringify({STATUS:[{STATUS:'E',Msg:'private-error'}]}),{},/NOT_SUCCESSFUL/],
  ['bad JSON',()=>'{broken',{},/RESPONSE_INVALID/],
  ['oversized reply',()=> 'x'.repeat(1000),{maxBytes:128},/TOO_LARGE/],
  ['no reply',()=>null,{timeoutMs:50},/TIMEOUT/]]) {
  test(label+' is rejected',()=>socketFixture(async client=>assert.rejects(()=>client.query('summary'),pattern),{reply,...options}));
}
test('unknown engine or malformed summaries are rejected',()=>socketFixture(async client=>{
  await assert.rejects(()=>client.readTelemetry(),/ENGINE_UNRECOGNIZED/);
},{reply:command=>JSON.stringify(command==='version'?good('VERSION',[{Unknown:'fixture'}]):defaults[command])}));
