import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeShowcaseQuery,canonicalShowcaseQuery,SHOWCASE_QUERY_CONTRACT} from './showcase-query.mjs';

test('normal links from Crown user-facing gallery and Layer 3 studio remain canonical',()=>{
  assert.equal(SHOWCASE_QUERY_CONTRACT,'NEO-CROWN-SHOWCASE-QUERY-V1');
  assert.equal(canonicalShowcaseQuery('asset=NOMNI&format=svg&face=front'),'asset=NOMNI&format=svg&face=front');
  assert.equal(canonicalShowcaseQuery('mode=preview&asset=NEOBOND&instrument_type=bond&network=runes'),
    'asset=NEOBOND&mode=preview&instrument_type=bond&network=runes');
  assert.equal(canonicalShowcaseQuery('asset=NOMNI&mode=observed&style=auto&format=json'),
    'asset=NOMNI&mode=observed&style=auto&format=json');
});
test('HTML-escaped ampersand keys from copied/shared links are accepted, not treated as unknown',()=>{
  const raw='asset=NOMNI&amp;format=svg&amp;face=front';
  const q=normalizeShowcaseQuery(raw);
  assert.equal(q.get('asset'),'NOMNI');
  assert.equal(q.get('format'),'svg');
  assert.equal(q.get('face'),'front');
  assert.equal(canonicalShowcaseQuery('mode=preview&amp;asset=NEOBOND&amp;instrument_type=bond&amp;network=runes'),
    'asset=NEOBOND&mode=preview&instrument_type=bond&network=runes');
  assert.equal(canonicalShowcaseQuery('asset=NOMNI&amp%3Bformat=svg'),
    'asset=NOMNI&format=svg');
});
test('harmless link decoration from ChatGPT or social apps is ignored without changing card semantics',()=>{
  for(const name of ['utm_source','utm_medium','utm_campaign','utm_term','utm_content','utm_id','gclid','fbclid','msclkid','igshid','_gl','ref','referrer','source']){
    const raw='asset=NOMNI&format=svg&'+name+'=chatgpt';
    assert.equal(canonicalShowcaseQuery(raw),'asset=NOMNI&format=svg');
  }
  assert.equal(canonicalShowcaseQuery('asset=NOMNI&amp;utm_source=chatgpt&amp;format=svg'),'asset=NOMNI&format=svg');
});
test('same-value duplicates are harmless, including HTML-escaped equivalents',()=>{
  for(const raw of [
    'asset=NOMNI&asset=NOMNI&format=svg',
    'asset=NOMNI&amp;asset=NOMNI&format=svg&format=svg',
    'mode=preview&mode=preview&asset=NEOBOND&asset=NEOBOND'
  ]){
    const q=normalizeShowcaseQuery(raw);
    assert.equal(q.getAll('asset').length,1);
    if(q.has('format'))assert.equal(q.getAll('format').length,1);
  }
});
test('conflicting asset/type/issuance selector duplicates remain rejected',()=>{
  const cases=[
    'asset=NOMNI&asset=NOTNOMNI',
    'asset=NOMNI&amp;asset=NOTNOMNI',
    'asset=NOMNI&mode=observed&mode=preview',
    'mode=preview&instrument_type=bond&instrument_type=shares',
    'mode=preview&network=runes&network=counterparty',
    'mode=preview&format=json&format=svg'
  ];
  for(const raw of cases)assert.throws(()=>normalizeShowcaseQuery(raw),/conflicting_showcase_parameter/,raw);
});
test('unsupported selectors, unsafe key tricks, param amplification and excessive URLs still fail closed',()=>{
  for(const raw of [
    'asset=NOMNI&issuer_verified=true',
    'asset=NOMNI&tx_hash=a',
    'asset=NOMNI&private_key=unsafe',
    'asset=NOMNI&__proto__=hijack',
    'asset=NOMNI&amp;amp;mode=preview',
    'asset=NOMNI&mode='+('x'.repeat(2500)),
    'asset=NOMNI&'+Array.from({length:25},(_,i)=>'utm_id='+i).join('&')
  ]){
    assert.throws(()=>normalizeShowcaseQuery(raw),raw);
  }
});
