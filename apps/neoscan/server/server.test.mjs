import test from 'node:test';
import assert from 'node:assert/strict';
import {validateEnv,parseOriginList} from './server.mjs';

test('parseOriginList supports comma-separated origins',()=>{
  assert.deepEqual(parseOriginList('https://a.example, https://b.example'),['https://a.example','https://b.example']);
});

test('validateEnv accepts default public origin and port',()=>{
  const status=validateEnv({});
  assert.equal(status.ok,true);
  assert.equal(status.port,8788);
  assert.deepEqual(status.allowedOrigins,['https://shemsizedek.github.io']);
});

test('validateEnv rejects invalid port',()=>{
  const status=validateEnv({PORT:'99999'});
  assert.equal(status.ok,false);
  assert.match(status.errors.join(' '),/PORT/);
});

test('validateEnv requires complete CES endpoint and account configuration',()=>{
  const status=validateEnv({NEOSCAN_CES_ENDPOINT:'https://ces.example'});
  assert.equal(status.ok,false);
  assert.match(status.errors.join(' '),/NEOSCAN_CES_ACCOUNT/);
});

test('validateEnv warns but does not fail when CES token is absent',()=>{
  const status=validateEnv({NEOSCAN_CES_ENDPOINT:'https://ces.example',NEOSCAN_CES_ACCOUNT:'acct-1'});
  assert.equal(status.ok,true);
  assert.equal(status.cesConfigured,true);
  assert.match(status.warnings.join(' '),/NEOSCAN_CES_TOKEN/);
});
