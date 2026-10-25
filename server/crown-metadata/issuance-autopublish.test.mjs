import test from 'node:test';
import assert from 'node:assert/strict';
import {crownIssuanceDescription,prepareCrownIssuance,verifyIssuanceForMetadata,validateLegacyEnhancedJSON} from './issuance-autopublish.mjs';
const address='1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk';
const url='https://crown.holytemples.org/assets/NOMNI/tokenscan.json';
const plan=()=>prepareCrownIssuance({asset:'NOMNI',ownerAddress:address,description:'Issuer-supplied description; not verified financial claims.',website:'https://neo-crown-cardmaster-runtime.onrender.com/'});
const evidence=()=>({asset:'NOMNI',status:'confirmed',network:'bitcoin-mainnet',protocol:'counterparty',issuer:address,description:url,current_asset_description:url,tx_hash:'a'.repeat(64),block_index:972725,verified_from_counterparty_api:true,checked_at:'2026-10-25T17:30:00Z'});
test('Crown prepares exact canonical metadata description before token signing',()=>{
  assert.equal(crownIssuanceDescription('NOMNI'),url);
  assert.equal(plan().asset_description_for_signer,url);
  assert.equal(plan().broadcast_performed,false);
  assert.equal(plan().signing_performed,false);
  assert.equal(plan().metadata.asset,'NOMNI');
  assert.equal(plan().requires_user_signature,true);
});
test('reject bad names, unsafe websites and missing control/description',()=>{
  for(const asset of ['../../NOMNI','nomni','A'.repeat(25),'','BTC/USD']){
    assert.throws(()=>crownIssuanceDescription(asset));
  }
  assert.throws(()=>prepareCrownIssuance({asset:'NOMNI',ownerAddress:address,description:'Bad'+String.fromCharCode(10)+'Description'}));
  assert.throws(()=>prepareCrownIssuance({asset:'NOMNI',ownerAddress:address,description:'Good',website:'javascript:alert(1)'}));
  assert.throws(()=>prepareCrownIssuance({asset:'NOMNI',ownerAddress:'unverified',description:'Good'}));
});
test('only confirmed Counterparty issuance with matching on-chain description may publish',()=>{
  const verified=verifyIssuanceForMetadata(plan(),evidence());
  assert.equal(verified.asset,'NOMNI');
  assert.equal(verified.metadata.asset,'NOMNI');
  assert.equal(verified.receipt.tx_hash,'a'.repeat(64));
  assert.equal(verified.publication_status,'VERIFIED_READY_FOR_DEPLOY');
  assert.equal(verified.onchain_broadcast,false);
  assert.match(verified.file_path,/assets\/NOMNI\/tokenscan\.json$/);
});
test('reject unconfirmed, wrong owner, wrong network, mismatched current metadata and unverifiable provider evidence',()=>{
  const badCases=[
    {status:'pending'},{network:'bitcoin-testnet'},{issuer:'1BadWallet1111111111111111111'},
    {asset:'NOTNOMNI'},{description:'https://bad.example/tokenscan.json'},
    {current_asset_description:'https://bad.example/tokenscan.json'},
    {tx_hash:'missing'},{block_index:0},{verified_from_counterparty_api:false}
  ];
  for(const change of badCases) assert.throws(()=>verifyIssuanceForMetadata(plan(),{...evidence(),...change}),JSON.stringify(change));
});
test('TokenScan compatibility JSON is the strict minimal enhanced format',()=>{
  const valid=validateLegacyEnhancedJSON(plan().metadata);
  assert.deepEqual(Object.keys(valid),['asset','description','website']);
  assert.throws(()=>validateLegacyEnhancedJSON({asset:'NOMNI',description:'valid',wallet_private_key:'secret'}));
  assert.throws(()=>validateLegacyEnhancedJSON({asset:'NOMNI',image:'https://example.com/logo.svg'}));
  assert.throws(()=>validateLegacyEnhancedJSON({asset:'NOMNI',website:'http://127.0.0.1/private'}));
});
