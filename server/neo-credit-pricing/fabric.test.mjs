import test from 'node:test';import assert from 'node:assert/strict'
import {createProduct,createPricingPolicy,selectRiskBand,priceOffer,calculateEffectiveCost,createOfferVersion,createPricingOverride,pricingSnapshot} from './fabric.mjs'
test('risk band selection works',()=>{const p=createPricingPolicy({policy_id:'p',product_id:'x',product_version:'1',bands:[{name:'A',min_score:80,max_score:100,spread_bps:100}]});assert.equal(selectRiskBand(p,{score:90}).name,'A')})
test('pricing enforces product limits',()=>{const pr=createProduct({product_id:'x',name:'X',version:'1',min_amount:1,max_amount:100,min_term_months:1,max_term_months:12}),po=createPricingPolicy({policy_id:'p',product_id:'x',product_version:'1',bands:[{name:'A',min_score:0,max_score:100,spread_bps:0}]});assert.equal(priceOffer({product:pr,policy:po,application:{requested_amount:200,term_months:12},score:90}).eligible,false)})
test('effective cost is internal estimate only',()=>assert.equal(calculateEffectiveCost({principal:1000,rate_bps:1200,term_months:12,fees:10}).apr_status,'INTERNAL_ESTIMATE_ONLY'))
test('offer version requires eligible pricing',()=>assert.throws(()=>createOfferVersion({application_id:'a',pricing:{eligible:false},expires_at:'2027-01-01'}),/eligible pricing/))
test('pricing override requires evidence',()=>assert.throws(()=>createPricingOverride({override_id:'o',offer_version_id:'v',actor_id:'a',reason:'x'}),/evidence required/))
test('snapshot keeps disclosure unverified',()=>assert.equal(pricingSnapshot({}).jurisdiction_disclosure_verified,false))
