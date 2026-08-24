import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createStore } from './store.mjs';
import { createAuth } from './auth.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');

test('terminal and staff session enforces merchant and permissions',()=>{
  process.env.NEO_COUNTER_TERMINALS_JSON=JSON.stringify([{id:'term-1',merchantId:'m1',secretHash:hash('terminal-secret'),enabled:true}]);
  process.env.NEO_COUNTER_STAFF_JSON=JSON.stringify([{id:'cashier-1',merchantId:'m1',pinHash:hash('1440'),permissions:['register'],active:true}]);
  const store=createStore(':memory:');
  const auth=createAuth(store.db);
  const session=auth.createSession({merchantId:'m1',terminalId:'term-1',terminalSecret:'terminal-secret',staffId:'cashier-1',pin:'1440'});
  assert.ok(session?.token);
  const req={headers:{authorization:`Bearer ${session.token}`}};
  const principal=auth.sessionPrincipal(req);
  assert.equal(principal.staffId,'cashier-1');
  assert.equal(auth.can(principal,'register','m1'),true);
  assert.equal(auth.can(principal,'settings','m1'),false);
  assert.equal(auth.can(principal,'register','m2'),false);
  assert.equal(auth.revoke(req),true);
  assert.equal(auth.sessionPrincipal(req),null);
  store.close();
});

test('invalid terminal or staff credentials fail closed',()=>{
  process.env.NEO_COUNTER_TERMINALS_JSON=JSON.stringify([{id:'term-1',merchantId:'m1',secretHash:hash('secret')}]);
  process.env.NEO_COUNTER_STAFF_JSON=JSON.stringify([{id:'owner',merchantId:'m1',pinHash:hash('9999'),permissions:['*']}]);
  const store=createStore(':memory:');
  const auth=createAuth(store.db);
  assert.equal(auth.createSession({merchantId:'m1',terminalId:'term-1',terminalSecret:'wrong',staffId:'owner',pin:'9999'}),null);
  assert.equal(auth.createSession({merchantId:'m1',terminalId:'term-1',terminalSecret:'secret',staffId:'owner',pin:'wrong'}),null);
  store.close();
});
