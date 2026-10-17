import test from 'node:test';import assert from 'node:assert/strict';
import {createPilot,transition,validateQuote,verifyChain} from './escrow.mjs';
test('quote uses explicit reference not implied liquidity',()=>{const q=validateQuote({usd:75000,usdPerNomni:2});assert.equal(q.nomni,37500);assert.equal(q.marketRateVerified,false);});
test('invalid quotes and owner stake rejected',()=>{assert.throws(()=>validateQuote({usd:75000,usdPerNomni:0}));assert.throws(()=>createPilot({ownerStake:101}));});
test('escrow journal deterministic order and integrity',()=>{const p=createPilot();assert.throws(()=>transition(p,'ESCROW_FUNDED_SIM'));for(const t of ['QUOTE_RECORDED','ESCROW_PLEDGED_SIM','ESCROW_FUNDED_SIM','TITLE_REVIEW','RELEASE_BLOCKED'])transition(p,t);assert.ok(verifyChain(p));assert.throws(()=>transition(p,'PAYMENT_RELEASED'));p.events[0].type='TAMPERED';assert.equal(verifyChain(p),false);});
test('no production transitions',()=>{const p=createPilot();p.sandbox=false;assert.throws(()=>transition(p,'QUOTE_RECORDED'));});
