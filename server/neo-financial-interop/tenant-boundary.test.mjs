import test from 'node:test';
import assert from 'node:assert/strict';
import {createScopedFinancialPlanner} from './tenant-boundary.mjs';
const intent={surface:'NEOPAY',operation:'BTC_DONATION_REQUEST',workspace:'TEAM',actorRef:'agent-temple-001',accountRef:'team-account-001',asset:'BTC',idempotencyKey:'payment-intent-test-key-01'};
const ctx=Object.freeze({workspace:'TEAM',actorRef:'agent-temple-001',accountRef:'team-account-001',scopes:Object.freeze(['payments:receive']),status:'ACTIVE',issuer:'NEOPASS_SERVER'});
const account=Object.freeze({workspace:'TEAM',actorRef:'agent-temple-001',accountRef:'team-account-001',status:'ACTIVE',issuer:'NEOBANK_SERVER'});
const planner=(session=ctx,acct=account)=>createScopedFinancialPlanner({resolveSession:async()=>session,resolveAccount:async()=>acct});
test('authorized TEAM user can plan a non-executing Counterpay request through NEO Pay',async()=>{
 const p=await planner().plan({sessionRef:'session-001',intent});
 assert.equal(p.service,'COUNTERPAY_RAIL');assert.equal(p.scopeVerified,true);assert.equal(p.accountVerified,true);
 assert.equal(p.executed,false);assert.equal(p.broadcast,false);assert.equal(p.postedToLedger,false);
});
test('cannot substitute personal workspace or another account',async()=>{
 for(const patch of [{workspace:'PERSONAL'},{actorRef:'other-agent-001'},{accountRef:'other-account-001'}])
 await assert.rejects(planner().plan({sessionRef:'session-001',intent:{...intent,...patch}}),/cross_workspace/);
});
test('scope and account must both be independently verified',async()=>{
 await assert.rejects(planner(Object.freeze({...ctx,scopes:Object.freeze([])})).plan({sessionRef:'session-001',intent}),/scope_not_granted/);
 await assert.rejects(planner(ctx,Object.freeze({...account,status:'PENDING'})).plan({sessionRef:'session-001',intent}),/account_authority_not_verified/);
});
test('browser claims of server identity and forged approval are rejected',async()=>{
 await assert.rejects(planner().plan({sessionRef:'session-001',intent:{...intent,authorization:'approved'}}),/unexpected_intent_field/);
 await assert.rejects(planner({...ctx}).plan({sessionRef:'session-001',intent}),/trusted_context_required/);
});
test('CES transfer and fiat on-ramp remain non-executing even when authorized',async()=>{
 const full=Object.freeze({...ctx,scopes:Object.freeze(['payments:receive','ces:prepare','fiat:request'])});
 const p=planner(full);
 const ces=await p.plan({sessionRef:'session-001',intent:{...intent,operation:'CES_CREDIT_TRANSFER_INTENT',asset:'CES_CREDIT'}});
 assert.equal(ces.mode,'PREPARE_ONLY');assert.equal(ces.postedToLedger,false);
 const fiat=await p.plan({sessionRef:'session-001',intent:{...intent,operation:'FIAT_ONRAMP_INTENT',asset:'USD'}});
 assert.equal(fiat.mode,'BLOCKED_PROVIDER_AND_REGULATORY_GATE');assert.equal(fiat.executed,false);
});
test('invalid session and missing trusted account resolver fail closed',async()=>{
 await assert.rejects(planner().plan({sessionRef:'bad session',intent}),/invalid_session_reference/);
 assert.throws(()=>createScopedFinancialPlanner({resolveSession:async()=>ctx}),/trusted_resolvers_required/);
});
