import test from 'node:test';
import assert from 'node:assert/strict';
import {createCoinbaseSandbox} from './sandbox.mjs';

const valid = {provider:'coinbase',service:'neo-bank',action:'quote',asset:'BTC',network:'bitcoin',reference:'staging_1'};

test('offline simulator refuses access until explicitly enabled',()=>{
  assert.throws(()=>createCoinbaseSandbox().evaluate(valid),/disabled/);
});

test('simulates without returning executable instructions or customer records',()=>{
  const audit=[];
  const runner=createCoinbaseSandbox({enabled:true,recordAudit:event=>audit.push(event)});
  const result=runner.evaluate(valid);
  assert.equal(result.executable,false);
  assert.equal(result.status,'simulated-no-provider-connection');
  assert.deepEqual(Object.keys(result).sort(),['action','asset','executable','mode','network','provider','service','status'].sort());
  assert.equal(audit[0].reference,'staging_1');
  assert.equal(Object.isFrozen(result),true);
  assert.equal(Object.isFrozen(audit[0]),true);
});

test('fails closed for EVM, wrapped BTC and live transfer instructions',()=>{
  const runner=createCoinbaseSandbox({enabled:true});
  for (const change of [{network:'base'},{asset:'cbBTC'},{action:'withdraw'},{action:'transfer'},{action:'trade'},{action:'sign'},{apiKey:'secret'},{accountId:'internal'}]) {
    assert.throws(()=>runner.evaluate({...valid,...change}));
  }
});
