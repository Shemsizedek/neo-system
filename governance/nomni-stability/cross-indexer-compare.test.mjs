import test from 'node:test';
import assert from 'node:assert/strict';
import {compareNomniPublicIndexers} from './cross-indexer-compare.mjs';
const asset={result:{asset:'NOMNI',asset_id:'6195210',supply:900000000,divisible:false,locked:true,issuer:'1NySA74g62Mr28Unp4uCxwtQv9FkD7AVpk',owner:'18FyntJG9hdXYvanm67mGgbyo1P7adckvg'}};
const second={asset:'NOMNI',asset_id:6195210,supply:900000000,divisible:false,locked:true,issuer:asset.result.issuer,owner:asset.result.owner};
const genesis={asset:'NOMNI',status:'valid',quantity:900000000,block_index:421813,tx_hash:'83c5e316c4ecce8bab8c5ec966da754da32548105c6fd6eb5349659d06c70925',source:asset.result.issuer};
const rows=[genesis,{...genesis,quantity:0,block_index:543489,tx_hash:'f'.repeat(64)}];
const p={result:rows,next_cursor:null,result_count:2};
const s={data:[{...genesis,quantity:'900000000'},{...rows[1],quantity:'0'}],total:2};
test('matching explorer metadata does not certify independent node or bank solvency',()=>{
 const r=compareNomniPublicIndexers(asset,p,second,s);
 assert.equal(r.status,'CROSS_INDEXER_METADATA_MATCH');
 assert.equal(r.supply,'900000000');
 assert.equal(r.secondSyncedNodeVerified,false);
 assert.equal(r.legalReserveAssetsVerified,false);
});
test('fails closed on ticker, genesis, supply, ownership or incomplete pagination',()=>{
 for(const change of [{supply:800000000},{divisible:true},{locked:false},{issuer:'wrong'},{asset:'NOTNOMNI'}]){
  assert.throws(()=>compareNomniPublicIndexers(asset,p,{...second,...change},s));
 }
 assert.throws(()=>compareNomniPublicIndexers(asset,p,second,{data:[{...genesis,quantity:'100'}],total:1}));
 assert.throws(()=>compareNomniPublicIndexers(asset,{...p,next_cursor:'next'},second,s));
});
