import test from 'node:test';
import assert from 'node:assert/strict';
import {alpacaStart,alpacaCallback,alpacaReadOnlyAccount,ALPACA_OAUTH} from './alpaca-oauth.mjs';

test('start binds paper environment and exact redirect to durable state',async()=>{
 let saved;const url=new URL(await alpacaStart({clientId:'test-id',sessionId:'session-1',saveState:async value=>{saved=value;},now:()=>1000}));
 assert.equal(url.origin,'https://app.alpaca.markets');
 assert.equal(url.searchParams.get('env'),'paper');
 assert.equal(url.searchParams.get('redirect_uri'),ALPACA_OAUTH.callbackUrl);
 assert.ok(saved.stateHash);assert.equal(saved.expiresAt,301000);
 assert.notEqual(saved.stateHash,url.searchParams.get('state'));
});
test('rejects unregistered redirect',async()=>{
 assert.throws(()=>alpacaStart({clientId:'x',sessionId:'s',saveState:()=>{},redirectUri:'https://evil.example/cb'}),/redirect_mismatch/);
});
test('successful callback stores token only through private injected storage',async()=>{
 let saved;const url=new URL(await alpacaStart({clientId:'test-id',sessionId:'session-1',saveState:v=>{saved=v;},now:()=>1000}));
 let writes=0;const result=await alpacaCallback({state:url.searchParams.get('state'),code:'test-code',sessionId:'session-1',takeState:async()=>saved,clientId:'test-id',getClientSecret:async()=> 'mock-secret',storeToken:async record=>{writes++;assert.equal(record.environment,'paper');assert.equal(record.token.access_token,'mock-access');},fetchImpl:async (_url,options)=>{assert.equal(options.method,'POST');return {ok:true,json:async()=>({access_token:'mock-access',token_type:'bearer'})};},now:()=>2000});
 assert.equal(writes,1);assert.equal(result.status,'authorized');
});
test('rejects mismatched session prior to token call',async()=>{
 let saved;const url=new URL(await alpacaStart({clientId:'test-id',sessionId:'session-1',saveState:v=>{saved=v;},now:()=>1000}));
 await assert.rejects(alpacaCallback({state:url.searchParams.get('state'),code:'code',sessionId:'different',takeState:async()=>saved,clientId:'x',getClientSecret:async()=>{throw Error('should not call');},storeToken:async()=>{},now:()=>2000}),/invalid_or_expired_state/);
});
test('rejects expired state prior to token call',async()=>{
 let saved;const url=new URL(await alpacaStart({clientId:'test-id',sessionId:'session-1',saveState:v=>{saved=v;},now:()=>1000}));
 await assert.rejects(alpacaCallback({state:url.searchParams.get('state'),code:'code',sessionId:'session-1',takeState:async()=>saved,clientId:'x',getClientSecret:async()=>'',storeToken:async()=>{},now:()=>400000}),/invalid_or_expired_state/);
});
test('read-only account request contains no trading mutation',async()=>{
 const result=await alpacaReadOnlyAccount({accessToken:'private-token',fetchImpl:async(url,options)=>{assert.equal(url,ALPACA_OAUTH.paperAccountUrl);assert.equal(options.method,undefined);assert.equal(options.headers.Authorization,'Bearer private-token');return {ok:true,json:async()=>({status:'ACTIVE',currency:'USD',account_number:'not-public',trading_blocked:false})};}});
 assert.equal(result.account_number,undefined);assert.equal(result.status,'ACTIVE');
});
