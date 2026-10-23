import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {RELEASE,validatePlan,createDraft,parseDrafts,isFreshEvidence,assessMiningEvidence,createCounterCheckoutUrl,canActivateFromBrowser,canIssueTokenFromShares} from '../../public/neo-cloud-miner/core.js';
import {signReadRequest,createNiceHashReadOnlyClient,niceHashDevelopmentStatus} from './nicehashReadOnly.mjs';
const plan = {hashrateTh:100,termDays:30,requestedRail:'BTC',assetReference:'PUBLIC.ASSET'};
const id = 'PLAN-12345678-abcd';
const time = '2026-10-23T19:00:00.000Z';
const now = Date.parse(time);
const reply = value => new Response(JSON.stringify(value),{status:200,headers:{'content-type':'application/json'}});

test('release never enables purchases or token issuance',() => {
  assert.equal(RELEASE.purchasesEnabled,false);assert.equal(RELEASE.tokenIssuanceEnabled,false);
  assert.equal(canActivateFromBrowser({neo_checkout:'success',paid:true}),false);
  assert.equal(canIssueTokenFromShares({acceptedShares:99999}),false);
});
test('a valid plan produces only an unpurchased local draft',() => {
  const draft = createDraft(plan,{id,now:time});
  assert.equal(draft.state,'LOCAL_DRAFT');assert.equal(draft.amountDue,null);
  assert.equal(draft.paymentVerified,false);assert.equal(draft.miningVerified,false);assert.equal(draft.tokenIssued,false);
  assert.equal(draft.providerAllocationId,null);assert.equal(draft.network,'UNASSIGNED');
});
for (const invalid of [0,-1,Infinity,NaN,1.5,100001]) test(`invalid target ${invalid} rejected`,() => assert.throws(() => validatePlan({...plan,hashrateTh:invalid})));
test('unsupported rails, durations and secret-like free text are rejected',() => {
  assert.throws(() => validatePlan({...plan,termDays:0}));assert.throws(() => validatePlan({...plan,requestedRail:'UNSUPPORTED'}));
  assert.throws(() => validatePlan({...plan,assetReference:'seed phrase words are not an asset'}));
  assert.throws(() => validatePlan({...plan,assetReference:'<script>alert(1)</script>'}));
});
test('untrusted local storage cannot promote a draft to a financial asset',() => {
  const draft = createDraft(plan,{id,now:time});
  const restored = parseDrafts(JSON.stringify([{...draft,paymentVerified:true,miningVerified:true,tokenIssued:true,amountDue:1000}]));
  assert.equal(restored[0].paymentVerified,false);assert.equal(restored[0].tokenIssued,false);assert.equal(restored[0].amountDue,null);
  assert.throws(() => parseDrafts(JSON.stringify([{...draft,state:'ACTIVE'}])));
  assert.throws(() => parseDrafts(JSON.stringify([draft,draft])));
  assert.throws(() => parseDrafts('{broken'));
  assert.deepEqual(parseDrafts(null),[]);
});
test('testnet, fabricated, stale and future evidence cannot become mainnet proof',() => {
  const valid = {network:'mainnet',simulation:false,observedAt:time,source:'AUTHENTICATED_POOL_ADAPTER',signatureVerified:true,allocationId:'A1',acceptedShares:5};
  assert.equal(assessMiningEvidence(valid,now).verified,true);
  for (const changes of [{network:'testnet'},{simulation:true},{observedAt:new Date(now-60001).toISOString()},{observedAt:new Date(now+1).toISOString()},{signatureVerified:false},{source:'BROWSER'},{acceptedShares:0},{allocationId:''}]) assert.equal(assessMiningEvidence({...valid,...changes},now).verified,false);
  assert.equal(assessMiningEvidence(valid,now).btcReceived,null);
  assert.equal(assessMiningEvidence(valid,now).tokenIssuanceAuthorized,false);
  assert.equal(isFreshEvidence(valid,NaN),false);
});
test('NEO Counter redirect follows the documented contract but does not activate it',() => {
  const url = new URL(createCounterCheckoutUrl({id:'ORDER_123',amountCents:12500,rail:'BTC'}));
  assert.equal(url.searchParams.get('service'),'neo-miner');assert.equal(url.searchParams.get('amount'),'12500');
  assert.equal(url.searchParams.get('order'),'ORDER_123');assert.equal(url.searchParams.get('rail'),'BTC');
  assert.equal(canActivateFromBrowser(Object.fromEntries(url.searchParams)),false);
  assert.throws(() => createCounterCheckoutUrl({id:'ORDER',amountCents:NaN,rail:'BTC'}));
  assert.throws(() => createCounterCheckoutUrl({id:'ORDER',amountCents:10,rail:'BTC'},'https://untrusted.example/'));
});
test('NiceHash signature includes the official reserved NUL fields',() => {
  const input = {key:'test-key',secret:'test-secret',organizationId:'test-org',time:'1234',nonce:'unique-nonce',path:'/main/api/v2/hashpower/myOrders',query:''};
  const framing = 'test-key\x001234\x00unique-nonce\x00\x00test-org\x00\x00GET\x00/main/api/v2/hashpower/myOrders\x00';
  assert.equal(signReadRequest(input),createHmac('sha256','test-secret').update(framing).digest('hex'));
  assert.throws(() => signReadRequest({...input,key:'bad\0key'}));
});
test('provider defaults to testnet with GET-only credentials and redirect denial',async () => {
  let captured;
  const client = createNiceHashReadOnlyClient({key:'key',secret:'secret',organizationId:'org',now:() => now,fetchImpl:async(url,options) => {captured={url,options};return reply({list:[]});}});
  const result = await client.myOrders();
  assert.equal(client.network,'testnet');assert.ok(captured.url.startsWith('https://api-test.nicehash.com/'));
  assert.equal(captured.options.method,'GET');assert.equal(captured.options.redirect,'error');
  assert.ok(captured.options.headers['X-Auth'].startsWith('key:'));
  assert.equal(Object.values(captured.options.headers).includes('secret'),false);
  assert.equal(result.authoritativeForSettlement,false);assert.equal(result.authoritativeForTokenIssuance,false);
  assert.equal('buy' in client,false);assert.equal('withdraw' in client,false);
});
test('provider disallows arbitrary endpoints and credentials are not sent on public reads',async () => {
  let called = false;
  const client = createNiceHashReadOnlyClient({fetchImpl:async(url,options) => {called=true;assert.equal(options.headers['X-Auth'],undefined);return reply({miningAlgorithms:[]});}});
  assert.throws(() => createNiceHashReadOnlyClient({network:'https://attacker.example'}));
  assert.throws(() => client.orderStatistics('../withdraw'));
  await assert.rejects(() => client.myOrders(),/CREDENTIALS_REQUIRED/);assert.equal(called,false);
  await client.marketInfo();assert.equal(called,true);
});
test('development diagnostics never expose account data or provider error bodies',async () => {
  const missing = await niceHashDevelopmentStatus({env:{}});assert.equal(missing.connected,false);
  const env = {NICEHASH_TEST_API_KEY:'key',NICEHASH_TEST_API_SECRET:'secret',NICEHASH_TEST_ORGANIZATION_ID:'org'};
  const success = await niceHashDevelopmentStatus({env,fetchImpl:async() => reply({list:[{poolPassword:'never-expose',balance:123}]})});
  assert.equal(success.connected,true);assert.equal(JSON.stringify(success).includes('never-expose'),false);
  const fail = await niceHashDevelopmentStatus({env,fetchImpl:async() => new Response('sensitive',{status:401})});
  assert.equal(fail.connected,false);assert.equal(JSON.stringify(fail).includes('sensitive'),false);
});
test('web has no active purchase handler, remote scripts or private-key collection',() => {
  const app = readFileSync(new URL('../../public/neo-cloud-miner/app.js',import.meta.url),'utf8');
  const html = readFileSync(new URL('../../public/neo-cloud-miner/index.html',import.meta.url),'utf8');
  assert.ok(!app.includes('createCounterCheckoutUrl'));assert.ok(!app.includes('innerHTML'));
  assert.ok(html.includes('NEO Counter checkout locked'));assert.ok(html.includes('type="button" disabled'));
  assert.ok(!/<script[^>]+src="https?:/i.test(html));assert.ok(html.includes("connect-src 'self'"));
});
