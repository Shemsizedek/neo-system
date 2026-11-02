import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const base=new URL('./',import.meta.url);
const text=async p=>readFile(new URL(p,base),'utf8');
test('static NEO Bank dashboard has all six sections and no fund actions',async()=>{
 const page=await text('index.html');
 for(const route of ['overview','accounts','exchange','markets','activity','integrations']){
  assert.match(page,new RegExp('data-view="'+route+'"'));
  assert.match(page,new RegExp('data-section="'+route+'"'));
 }
 assert.match(page,/NEO Bank \| Community Finance/);
 assert.match(page,/href="\.\/preview\.css"/);
 assert.match(page,/src="\.\/preview\.js"/);
 assert.match(page,/href="\.\/site-status\.json"/);
 assert.doesNotMatch(page,/href="\/preview\.css"|src="\/preview\.js"/);
 assert.doesNotMatch(page,/<form\b[^>]*>|type="password"|\bNMNIBANK\b|\bCES_SOURCE_DATABASE_URL\b/i);
 assert.match(page,/Transfers are not available/);
});
test('frontend is a navigation/status-only surface',async()=>{
 const js=await text('preview.js');
 assert.match(js,/showSection/);
 assert.match(js,/fetchStatus\('\.\/site-status\.json'\)/);
 assert.doesNotMatch(js,/\/api\/v1\/transfers|\/api\/v1\/auth|localStorage|sessionStorage|fetchStatus\('\/healthz'\)/);
});
test('public Pages status never claims financial accounts connected',async()=>{
 const status=JSON.parse(await text('site-status.json'));
 assert.equal(status.mode,'read-only-preview');
 assert.equal(status.accountServices,false);
 assert.equal(status.financialWrites,false);
 assert.equal(status.database,'not_attached');
});
