import test from 'node:test';
import assert from 'node:assert/strict';
import {createCesAuthorizedSessionTransport} from './session-transport.mjs';

function response({status=200,contentType='application/json',body={}}={}){
  return {
    ok:status>=200&&status<300,
    status,
    headers:{get(name){return name.toLowerCase()==='content-type'?contentType:null;}},
    async json(){return body;}
  };
}

test('requires short-lived authorized session material and never stores it in status',async()=>{
  let seenCookie=null;
  const transport=createCesAuthorizedSessionTransport({
    readUrl:'https://connector.example/ces/read-only',account:'CES-001',
    fetchImpl:async(_url,options)=>{seenCookie=options.headers.cookie;return response({body:{balances:[],transactions:[]}});}
  });
  await assert.rejects(()=>transport.readSnapshot({}),/session material is required/);
  const snapshot=await transport.readSnapshot({sessionCookie:'session=short-lived'});
  assert.equal(seenCookie,'session=short-lived');
  assert.equal(transport.status().credentialPersistence,false);
  assert.equal(JSON.stringify(transport.status()).includes('short-lived'),false);
  assert.equal(snapshot.provenance.method,'authorized-session');
});

test('fails closed on expired sessions',async()=>{
  const transport=createCesAuthorizedSessionTransport({readUrl:'https://connector.example/ces/read-only',account:'CES-001',fetchImpl:async()=>response({status:401})});
  await assert.rejects(()=>transport.readSnapshot({sessionCookie:'expired'}),/expired or unauthorized/);
});

test('rejects malformed non-json responses',async()=>{
  const transport=createCesAuthorizedSessionTransport({readUrl:'https://connector.example/ces/read-only',account:'CES-001',fetchImpl:async()=>response({contentType:'text/html',body:'login'})});
  await assert.rejects(()=>transport.readSnapshot({sessionCookie:'session=ok'}),/malformed response/);
});

test('supports zero-data snapshots without inventing balances or activity',async()=>{
  const transport=createCesAuthorizedSessionTransport({readUrl:'https://connector.example/ces/read-only',account:'CES-001',network:'CEN',fetchImpl:async()=>response({body:{balances:[],transactions:[]}})});
  const snapshot=await transport.readSnapshot({sessionCookie:'session=ok'});
  assert.deepEqual(snapshot.balances,[]);
  assert.deepEqual(snapshot.transactions,[]);
  assert.equal(snapshot.network,'CEN');
  assert.equal(snapshot.readOnly,true);
});
