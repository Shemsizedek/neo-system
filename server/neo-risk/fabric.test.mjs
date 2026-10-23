import test from 'node:test'
import assert from 'node:assert/strict'
import {normalizePosition,markPosition,portfolioExposure,concentrationRisk,calculateParametricVar,runStress,marginUtilization,evaluateLimits,createKillSwitch,applyKillSwitch,liquidationRecommendation,riskSnapshot} from './fabric.mjs'

test('missing prices remain explicit',()=>{const p=markPosition(normalizePosition({portfolio_id:'p',asset:'BTC',quantity:1}),{});assert.equal(p.status,'PRICE_MISSING');assert.deepEqual(portfolioExposure([p]).missing_prices,['BTC'])})
test('var fails closed with missing volatility',()=>{const p=markPosition(normalizePosition({portfolio_id:'p',asset:'BTC',quantity:1}),{price:100});assert.equal(calculateParametricVar({marked:[p],volatilityByAsset:{}}).available,false)})
test('stress model computes scenario pnl',()=>{const p=markPosition(normalizePosition({portfolio_id:'p',asset:'BTC',quantity:2}),{price:100});assert.equal(runStress([p],{down:{BTC:-.1}}).down.pnl,-20)})
test('margin deficit triggers risk breach',()=>{const m=marginUtilization({required_margin:120,eligible_collateral:100});const r=evaluateLimits({exposure:{gross:0,net:0,missing_prices:[]},concentration:{largest:null},varResult:{available:true,var:0},margin:m,limits:{}});assert.equal(r.allowed,false)})
test('kill switch blocks otherwise allowed risk',()=>{const k=createKillSwitch({reason:'test'});assert.equal(applyKillSwitch({allowed:true},{killSwitch:k}).allowed,false)})
test('liquidation remains recommendation only',()=>{const m=marginUtilization({required_margin:120,eligible_collateral:100});const r=liquidationRecommendation({marked:[],margin:m});assert.equal(r.auto_execution,false)})
test('snapshot preserves no-auto-liquidation posture',()=>{assert.equal(riskSnapshot({marked:[]}).auto_liquidation,false)})
