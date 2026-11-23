import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAsset, normalizeCompletedMatch, makeCandles, availableIndicators } from './history.mjs';

const base = {
  id: 'match-1',
  forward_asset: 'NOMNI', backward_asset: 'XCP',
  forward_quantity_normalized: '2.00000000',
  backward_quantity_normalized: '10.00000000',
  status: 'completed',
  block_time: 1781627730,
  block_index: 1000
};

test('normalizes completed matches without inventing raw denomination',()=>{
  const trade=normalizeCompletedMatch(base,'NOMNI','XCP');
  assert.equal(trade.price,5);
  assert.equal(trade.base_quantity,2);
  assert.equal(trade.quote_quantity,10);
  assert.equal(normalizeCompletedMatch({...base,status:'pending'},'NOMNI','XCP'),null);
  assert.equal(normalizeCompletedMatch({...base,forward_quantity_normalized:undefined,forward_quantity:200000000},'NOMNI','XCP'),null);
});
test('keeps price convention when forward and backward are reversed',()=>{
  const t=normalizeCompletedMatch({...base,forward_asset:'XCP',backward_asset:'NOMNI',
    forward_quantity_normalized:'10',backward_quantity_normalized:'2'},'NOMNI','XCP');
  assert.equal(t.price,5);
});
test('does not synthesize missing timestamps',()=>{
  assert.equal(normalizeCompletedMatch({...base,block_time:undefined},'NOMNI','XCP'),null);
  assert.equal(normalizeCompletedMatch({...base,block_time:'1781627730'},'NOMNI','XCP').time,1781627730);
});
test('builds sparse candles only from matching trades',()=>{
  const t=normalizeCompletedMatch(base,'NOMNI','XCP');
  const c=makeCandles([{...t,time:600,price:5,base_quantity:2,quote_quantity:10},
    {...t,id:'m2',time:620,price:7,base_quantity:3,quote_quantity:21},
    {...t,id:'m3',time:740,price:6,base_quantity:1,quote_quantity:6}],60);
  assert.deepEqual(c.map(x=>x.time),[600,720]);
  assert.deepEqual([c[0].open,c[0].high,c[0].low,c[0].close,c[0].base_volume,c[0].trades],[5,7,5,7,5,2]);
});
test('indicator warmup refuses false confidence on short series',()=>{
  const c=makeCandles([{id:'m',time:600,price:3,base_quantity:1,quote_quantity:3}],60);
  const v=availableIndicators(c);
  assert.equal(v[0].sma,null);
  assert.equal(v[0].rsi,null);
});
test('validates tradeable asset codes',()=>{
  assert.equal(validateAsset('nomni'),'NOMNI');
  assert.equal(validateAsset('XCP/../../secret'),null);
});
