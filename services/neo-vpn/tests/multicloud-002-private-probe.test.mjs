import test from 'node:test';
import assert from 'node:assert/strict';
import {isOverlayIPv4,normalizePeer,makeHandler,parseArgs,PORT,PATH}
  from '../diagnostics/multicloud-002-private-probe.mjs';

const REMOTE='100.70.2.3',LOCAL='100.70.2.4';
function exercise(handler,{from=REMOTE,method='GET',path=PATH}={}) {
  const response={status:null,body:null,headers:{},
    setHeader(key,value){this.headers[key]=value},
    writeHead(code){this.status=code;return this;},
    end(body){this.body=body;return this;}
  };
  handler({socket:{remoteAddress:from},method,url:path},response);
  return response;
}

test('accepts exact provider overlay IPv4, never other or ill-formed network',()=>{
  for(const ip of ['100.64.0.1','100.70.2.4','100.127.255.254']) assert.equal(isOverlayIPv4(ip),true);
  for(const ip of ['0.0.0.0','127.0.0.1','192.168.1.5','10.144.1.1','100.63.2.3',
    '100.128.0.1','100.70.02.4','::1','',null]) assert.equal(isOverlayIPv4(ip),false);
  assert.equal(normalizePeer('::ffff:100.70.2.3'),REMOTE);
});

test('never accepts public or wildcard binding or missing trusted source',()=>{
  const inputs=[
    ['--listen-ip','0.0.0.0','--allow-peer',REMOTE],
    ['--listen-ip','127.0.0.1','--allow-peer',REMOTE],
    ['--listen-ip',LOCAL,'--allow-peer','0.0.0.0'],
    ['--listen-ip',LOCAL,'--allow-peer',LOCAL],
    ['--listen-ip',LOCAL],
  ];
  for(const args of inputs) assert.throws(()=>parseArgs(args),/INVALID_PRIVATE_PEER_CONFIGURATION/);
});

test('strict validated configuration with short bounded life and unprivileged port',()=>{
  const parsed=parseArgs(['--listen-ip',LOCAL,'--allow-peer',REMOTE]);
  assert.equal(parsed.port,PORT);
  assert.equal(parsed.seconds,120);
  assert.throws(()=>parseArgs(['--listen-ip',LOCAL,'--allow-peer',REMOTE,'--seconds','9999']));
  assert.throws(()=>parseArgs(['--listen-ip',LOCAL,'--allow-peer',REMOTE,'--port','80']));
});

test('only explicitly authorized peer gets a one-shot status response',()=>{
  let count=0;
  const handler=makeHandler({allowedSource:REMOTE,onAccepted:()=>count++});
  let response=exercise(handler,{from:'::ffff:'+REMOTE});
  assert.equal(response.status,200);
  const body=JSON.parse(response.body);
  assert.equal(body.response,'PRIVATE_APPLICATION_RESPONSE');
  assert.equal(body.private_tunnel_verified,false);
  assert.equal(body.gateway_production_verified,false);
  assert.equal(count,1);
  response=exercise(handler);
  assert.equal(response.status,404);
  assert.equal(count,1);
});

test('non-authorized peers or wrong methods and paths get no probe data',()=>{
  const handler=makeHandler({allowedSource:REMOTE});
  const cases=[
    {from:'100.71.5.2'},
    {from:'::ffff:127.0.0.1'},
    {from:'192.168.1.10'},
    {from:REMOTE,method:'POST'},
    {from:REMOTE,path:'/'},
    {from:REMOTE,path:'http://elsewhere.com'},
  ];
  for(const args of cases){
    const result=exercise(handler,args);
    assert.equal(result.status,404);
    assert.equal(result.body,'{"error":"NOT_AVAILABLE"}\n');
  }
});

test('response is constant, no remote IP or auth data echoed',()=>{
  const handler=makeHandler({allowedSource:REMOTE});
  const r=exercise(handler);
  assert.equal(r.headers['cache-control'],'no-store');
  assert.ok(!r.body.includes(REMOTE));
  assert.ok(!r.body.includes(LOCAL));
});

test('one-shot state not consumed by failed unauthorized requests',()=>{
  const handler=makeHandler({allowedSource:REMOTE});
  assert.equal(exercise(handler,{from:'100.70.2.9'}).status,404);
  assert.equal(exercise(handler).status,200);
});

test('invalid source configuration is rejected without opening a server',()=>{
  assert.throws(()=>makeHandler({allowedSource:'100.128.0.1'}),/INVALID_ALLOWED_SOURCE/);
});
