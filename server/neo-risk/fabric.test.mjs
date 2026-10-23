import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizePosition,markPosition,portfolioExposure,calculateParametricVar,runStress,marginUtilization,evaluateLimits,createKillSwitch,applyKillSwitch,riskReview,riskSnapshot} from './fabric.mjs'

test('missing prices remain explicit',()=>{const p=markPosition(normalizePosition({portfolio_id:'p',asset:'BTC',quantity:1}),{});assert.equal(p.status,'PRICE_MISSING');assert.deepEqual(portfolioExposure([p]).missing_prices,['BTC'])})
test('var fails closed with missing volatility',()=>{const p=markPosition(normalizePosition({portfolio_id:'p',asset:'BTC',quantity:1}),{price:100});assert.equal(calculateParametricVar({marked:[p],volatilityByAsset:{}}).available,false)})
test('stress model computes scenario pnl',()=>{const p=markPosition(normalizePosition({portfolio_id:'p',asset:'BTC',quantity:2}),{price:100});assert.equal(runStress([p],{down:{BTC:-.1}}).down.pnl,-20)})
test('margin deficit triggers risk breach',()=>{const m=marginUtilization({required_margin:120,eligible_collateral:100});const r=evaluateLimits({exposure:{gross:0,net:0,missing_prices:[]},concentration:{largest:null},varResult:{available:true,var:0},margin:m,limits:{}});assert.equal(r.allowed,false)})
test('kill switch blocks otherwise allowed risk',()=>{const k=createKillSwitch({reason:'test'});assert.equal(applyKillSwitch({allowed:true},{killSwitch:k}).allowed,false)})
test('risk deficit creates manual review only',()=>{const m=marginUtilization({required_margin:120,eligible_collateral:100});assert.equal(riskReview({marked:[],margin:m}).action,'MANUAL_RISK_REVIEW')})
test('snapshot preserves no automatic position reduction',()=>{assert.equal(riskSnapshot({marked:[]}).automatic_position_reduction,false)})
