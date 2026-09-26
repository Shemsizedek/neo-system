import test from 'node:test';
import assert from 'node:assert/strict';
import {createMemorySocialOAuthStore} from './social-oauth-store.mjs';
import {connectionNeedsRefresh,createSocialTokenResolver} from './social-token-lifecycle.mjs';

test('durable OAuth store contract isolates identities and consumes state once',async()=>{
  const store=createMemorySocialOAuthStore();
  await store.putState({providerId:'linkedin',nonce:'n1',identityId:'u1',createdAt:100});
  assert.equal((await store.consumeState('linkedin','n1',{now:200}))?.identityId,'u1');
  assert.equal(await store.consumeState('linkedin','n1',{now:200}),null);
  await store.saveConnection({identityId:'u1',providerId:'linkedin',accessToken:'a'});
  assert.equal((await store.getConnection('u1','linkedin')).accessToken,'a');
  assert.equal(await store.getConnection('u2','linkedin'),null);
});

test('token lifecycle refreshes near-expiry connections and persists replacement',async()=>{
  const store=createMemorySocialOAuthStore();
  await store.saveConnection({identityId:'u1',providerId:'linkedin',accessToken:'old',refreshToken:'refresh',connectedAt:1000,expiresIn:1,expiresAt:2000});
  const fetchImpl=async()=>({ok:true,status:200,json:async()=>({access_token:'new',refresh_token:'refresh2',expires_in:3600,scope:'w_member_social'})});
  const resolve=createSocialTokenResolver({store,env:{LINKEDIN_CLIENT_ID:'id',LINKEDIN_CLIENT_SECRET:'secret'},fetchImpl});
  const result=await resolve('u1','linkedin');
  assert.equal(result.accessToken,'new');
  assert.equal((await store.getConnection('u1','linkedin')).refreshToken,'refresh2');
});

test('connectionNeedsRefresh honors expiry skew',()=>{
  assert.equal(connectionNeedsRefresh({expiresAt:1000},{now:900,skewMs:200}),true);
  assert.equal(connectionNeedsRefresh({expiresAt:2000},{now:900,skewMs:200}),false);
});
