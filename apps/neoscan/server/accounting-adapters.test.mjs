import test from 'node:test';
import assert from 'node:assert/strict';
import {createTokenScanAdapter} from '../adapters/tokenscan/adapter.mjs';
import {createAirwallexAccountingAdapter} from '../../accounting/adapters/airwallex/adapter.mjs';

function response(body,status=200){return {ok:status>=200&&status<300,status,json:async()=>body};}

test('TokenScan adapter returns source-observed metadata without claiming wallet ownership',async()=>{
  const calls=[];
  const adapter=createTokenScanAdapter({fetchImpl:async(url,options)=>{calls.push({url:String(url),method:options?.method||'GET'});return response({asset:'NOMNI',issuer:'issuer-address',supply:'900000000',divisible:false,locked:true});}});
  const result=await adapter.getAsset({asset:'NOMNI'});
  assert.equal(result.asset,'NOMNI');
  assert.equal(result.supply,'900000000');
  assert.equal(result.evidenceStatus,'source-observed');
  assert.equal(result.readOnly,true);
  assert.equal(result.issuer,'issuer-address');
  assert.equal(calls[0].method,'GET');
  assert.equal(JSON.stringify(result).includes('privateKey'),false);
});

test('TokenScan adapter rejects mismatched asset responses',async()=>{
  const adapter=createTokenScanAdapter({fetchImpl:async()=>response({asset:'OTHER',supply:'1'})});
  await assert.rejects(()=>adapter.getAsset({asset:'NOMNI'}),/returned OTHER/);
});

test('Airwallex adapter authenticates once, lists accounting fields read-only, and follows pagination',async()=>{
  const calls=[];
  const adapter=createAirwallexAccountingAdapter({
    clientId:'test-client',apiKey:'test-api-key',baseUrl:'https://api.sandbox.airwallex.com',
    fetchImpl:async(url,options={})=>{
      calls.push({url:String(url),method:options.method||'GET',headers:options.headers||{}});
      if(String(url).endsWith('/api/v1/authentication/login'))return response({token:'test-bearer',expires_at:new Date(Date.now()+25*60*1000).toISOString()});
      const parsed=new URL(String(url));
      if(parsed.pathname.endsWith('/accounting_fields')&&!parsed.pathname.endsWith('/accounting_field_values')){
        return parsed.searchParams.has('page')?response({items:[{id:'field-2'}]}):response({items:[{id:'field-1'}],page_after:'cursor-2'});
      }
      return response({items:[]});
    }
  });
  const result=await adapter.listAccountingFields();
  assert.deepEqual(result.items.map(x=>x.id),['field-1','field-2']);
  assert.equal(result.pages,2);
  assert.equal(calls.filter(x=>x.url.endsWith('/api/v1/authentication/login')).length,1);
  assert.ok(calls.filter(x=>x.method==='GET').every(x=>x.headers.authorization==='Bearer test-bearer'));
  assert.equal(calls.some(x=>x.method==='POST'&& !x.url.endsWith('/api/v1/authentication/login')),false);
});

test('Airwallex adapter refuses calls until server-side credentials are configured',async()=>{
  const adapter=createAirwallexAccountingAdapter({fetchImpl:async()=>{throw new Error('must not fetch');}});
  assert.equal(adapter.status().connectionState,'credentials-pending');
  await assert.rejects(()=>adapter.listAccountingFields(),/Client ID and API key are required/);
});
