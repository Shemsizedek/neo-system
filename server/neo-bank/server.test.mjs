import assert from 'node:assert/strict';
import test from 'node:test';
import {once} from 'node:events';
import {createNeoBankServer} from './server.mjs';
import {quoteFromOrders} from './market.mjs';

async function running(options,fn){const server=createNeoBankServer(options);server.listen(0,'127.0.0.1');await once(server,'listening');try{return await fn(`http://127.0.0.1:${server.address().port}`)}finally{server.close();await once(server,'close')}}
const store={ping:async()=>true,account:async id=>id==='CES-1'?{balance:25,currency:'NOMNI'}:null,ensureMember:async identity=>({accountNumber:'CES-1234567890',displayName:identity.name,role:identity.role}),accountBySubject:async subject=>subject==='google:user-1'?{accountNumber:'CES-1234567890',displayName:'NEO',email:'neo@example.test',role:'executive-admin',balance:25,creditLimit:100,status:'active'}:null,directory:async()=>[{accountNumber:'CES-1234567890',displayName:'NEO',role:'executive-admin'}],listOffers:async()=>[],statements:async()=>({account:{accountNumber:'CES-1234567890',displayName:'NEO',role:'executive-admin',balance:25,creditLimit:100},entries:[]}),updateAccount:async(accountNumber,input)=>({accountNumber,creditLimit:Number(input.creditLimit),status:input.status})};

test('calculates NOMNI/XCP midpoint from live order sides',()=>{
  const quote=quoteFromOrders({result:[
    {give_asset:'NOMNI',get_asset:'XCP',give_remaining:100000000,get_remaining:400000000},
    {give_asset:'XCP',get_asset:'NOMNI',give_remaining:200000000,get_remaining:100000000}
  ]});
  assert.equal(quote.bestAsk,4);assert.equal(quote.bestBid,2);assert.equal(quote.nomniXcp,3);assert.equal(quote.method,'order-book-midpoint');
});

test('health proves database connectivity',async()=>running({store},async base=>{
  const response=await fetch(`${base}/health`),body=await response.json();assert.equal(response.status,200);assert.equal(body.database,'connected');
}));

test('valuation publishes a sourced USD result only when liquidity exists',async()=>{
  const fetchImpl=async url=>{
    if(String(url).includes('/orders/')) return new Response(JSON.stringify({result:[{give_asset:'NOMNI',get_asset:'XCP',give_remaining:100000000,get_remaining:200000000}]}));
    if(String(url).includes('coingecko')) return new Response(JSON.stringify({bitcoin:{usd:50000},counterparty:{usd:4}}));
    return new Response(JSON.stringify({USD:50000}));
  };
  await running({store,fetchImpl},async base=>{const quote=await fetch(`${base}/api/v1/nomni/valuation`).then(r=>r.json());assert.equal(quote.available,true);assert.equal(quote.nomniUsd,8);assert.match(quote.source,/Counterparty/)});
});

test('private CES account data requires a server token',async()=>running({store,apiToken:'secret'},async base=>{
  assert.equal((await fetch(`${base}/api/v1/accounts/CES-1`)).status,401);
  const response=await fetch(`${base}/api/v1/accounts/CES-1`,{headers:{authorization:'Bearer secret'}});assert.equal(response.status,200);assert.equal((await response.json()).account.balance,25);
}));

test('public bank page has no wallet recovery form or wallet crypto scripts',async()=>running({store},async base=>{
  const html=await fetch(base).then(r=>r.text());assert.doesNotMatch(html,/neoPassphrase|wallet-crypto|unlockNeo|Open your Bitcoin/i);assert.match(html,/NEO Bank/);assert.match(html,/Open NEOpay/);
}));

test('Google NEOpass creates a secure session and unlocks the CES dashboard',async()=>running({store,sessionSecret:'session-secret',googleClientId:'client-1',executiveAdminEmail:'neo@example.test',verifyGoogleCredential:async()=>({sub:'user-1',email:'neo@example.test',email_verified:true,name:'NEO'})},async base=>{
  const login=await fetch(`${base}/api/v1/auth/google`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({credential:'verified'})});
  assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);
  const cookie=login.headers.get('set-cookie').split(';')[0],me=await fetch(`${base}/api/v1/me`,{headers:{cookie}});
  assert.equal(me.status,200);assert.equal((await me.json()).account.role,'executive-admin');
}));

test('CES application routes reject unauthenticated access',async()=>running({store,sessionSecret:'session-secret'},async base=>{
  for(const path of ['/api/v1/me','/api/v1/directory','/api/v1/offers','/api/v1/statements'])assert.equal((await fetch(`${base}${path}`)).status,401);
}));

test('executive admin can govern CES credit limits',async()=>running({store,sessionSecret:'session-secret',googleClientId:'client-1',executiveAdminEmail:'neo@example.test',verifyGoogleCredential:async()=>({sub:'user-1',email:'neo@example.test',email_verified:true,name:'NEO'})},async base=>{
  const login=await fetch(`${base}/api/v1/auth/google`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({credential:'verified'})}),cookie=login.headers.get('set-cookie').split(';')[0];
  const response=await fetch(`${base}/api/v1/admin/accounts/CES-1234567890`,{method:'PATCH',headers:{cookie,'content-type':'application/json'},body:JSON.stringify({creditLimit:500,status:'active'})});
  assert.equal(response.status,200);assert.equal((await response.json()).account.creditLimit,500);
}));
