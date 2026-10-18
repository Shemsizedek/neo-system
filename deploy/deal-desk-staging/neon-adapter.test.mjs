import test from 'node:test';import assert from 'node:assert/strict';
import {validateStagingConfig,createStagingStore,draftOpportunity,operatorAuthorized} from './neon-adapter.mjs';
const env={CASHFLOW_STAGING_ENABLED:'true',LIVE_TRANSACTIONS:'false',REAL_CUSTOMER_INTAKE:'false',DATABASE_URL:'postgresql://dummy:dummy@db.example.invalid/stage',PGSSLMODE:'verify-full',OIDC_ISSUER:'https://auth.example.invalid',OIDC_AUDIENCE:'neo-desk',OIDC_JWKS_URI:'https://auth.example.invalid/jwks'};
test('missing controls fail closed',()=>assert.equal(validateStagingConfig({}).valid,false));
test('authorized synthetic config is syntactically valid',()=>assert.equal(validateStagingConfig(env).valid,true));
test('customer intake activation rejected',()=>assert.ok(validateStagingConfig({...env,REAL_CUSTOMER_INTAKE:'true'}).errors.length));
test('only middleware verified operator role allowed',()=>{assert.equal(operatorAuthorized({verified:false,roles:['neo_sales_operator']}),false);assert.equal(operatorAuthorized({verified:true,roles:['neo_sales_operator']}),true);});
test('mock database connection ping and bound store',async()=>{const calls=[];class Pool{constructor(o){calls.push(o)}async query(sql){calls.push(sql);return {rows:[{connected:1}]}}};const r=await createStagingStore({env,Pool});assert.ok(r.store.insertIfAbsent);assert.equal(calls[1],'SELECT 1 AS connected');assert.equal(calls[0].ssl.rejectUnauthorized,true);});
test('lead opportunity requires consent and remains nonexecutable',()=>{const v=draftOpportunity({type:'inbound',payload:{id:'synthetic-1',consent:true,organization:'Test org',service:'Strategic Architecture',budget:'$75,000–$150,000',timeline:'1–3 months'}});assert.equal(v.actions.payments,false);assert.equal(v.requiresOperatorReview,true);});
