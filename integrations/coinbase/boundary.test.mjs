import test from 'node:test';
import assert from 'node:assert/strict';
import {assertCoinbaseBoundary, assertNativeBitcoinAsset} from './boundary.mjs';

const allowed = {provider:'coinbase', service:'neo-bank', action:'quote', asset:'BTC', network:'bitcoin', reference:'q_123'};
test('only limited read-only native Bitcoin requests are allowed', () => {
 for(const service of ['neo-bank','neo-pay','neo-fx']) {
  for(const action of ['quote','status','reconcile','deposit-instructions']) {
   assert.equal(assertCoinbaseBoundary({...allowed,service,action}).network,'bitcoin');
  }
 }
});
test('rejects unapproved services, actions, keys and NEO internal identifiers', () => {
 for(const extra of [{service:'neo-core'},{action:'withdraw'},{action:'trade'},{action:'transfer'},{action:'sign'},{seed:'abc'},{walletPrivateKey:'abc'},{userProfile:{name:'x'}},{reference:'email@example.com'}]) {
  assert.throws(()=>assertCoinbaseBoundary({...allowed,...extra}));
 }
});
test('rejects all ETH, Base, EVM, tokenized Bitcoin, and missing network', () => {
 for(const extra of [{network:'base'},{network:'ethereum'},{network:'Bitcoin'},{network:undefined},{asset:'cbBTC'},{asset:'WBTC'},{asset:'ETH'},{asset:'USDC'},{reference:'Base'},{reference:'erc20'}]) {
  assert.throws(()=>assertCoinbaseBoundary({...allowed,...extra}));
 }
});
test('provider response must identify BTC, native status and exact Bitcoin network', () => {
 assert.equal(assertNativeBitcoinAsset({asset:'BTC',network:'bitcoin',native:true}),true);
 for(const descriptor of [
 {asset:'BTC',network:'base',native:true},
 {asset:'BTC',network:'bitcoin',native:false},
 {asset:'BTC',network:'bitcoin'},
 {asset:'cbBTC',network:'bitcoin',native:true},
 {asset:'BTC',network:'bitcoin',native:true,relatedNetwork:'ethereum'},
 {asset:'BTC',network:'bitcoin',native:true,contract:'ERC20'},
 ]) assert.throws(()=>assertNativeBitcoinAsset(descriptor));
});
