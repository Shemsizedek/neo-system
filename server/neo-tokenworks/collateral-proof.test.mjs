import test from 'node:test';
import assert from 'node:assert/strict';
import {assessNomniCollateral} from './collateral-proof.mjs';
const now=Date.UTC(2026,9,31);
const blockHash='a'.repeat(64);
function input(){return {asset:'NOMNI',network:'bitcoin-mainnet-counterparty',wallet:{asset:'NOMNI',quantity:100,blockHash,blockHeight:900000,independentIndexerBlockHashes:[blockHash,blockHash],controlVerified:true,legalOwnershipVerified:true},market:{btcUsd:70000,btcBidPerNomni:0.000001,executableBidNomni:110,timestamp:now,venue:'TEST ONLY',marketEvidenceId:'MOCK-001'},reviews:{accounting:'APPROVED',valuation:'APPROVED',legal:'APPROVED',surety:'APPROVED',court:'APPROVED',haircut:0.5},now};}
test('mock fully evidenced record is review-ready but cannot execute',()=>{const result=assessNomniCollateral(input()); assert.equal(result.status,'REVIEW_READY');assert.equal(result.executionEnabled,false);assert.equal(result.eligibleCollateralUsd,3.5)});
test('no executable depth fails closed',()=>{const i=input();i.market.executableBidNomni=5;assert.equal(assessNomniCollateral(i).status,'HOLD')});
test('stale quote fails closed',()=>{const i=input();i.market.timestamp=now-600000;assert.equal(assessNomniCollateral(i).status,'HOLD')});
test('missing legal approval fails closed',()=>{const i=input();i.reviews.legal='PENDING';assert.equal(assessNomniCollateral(i).status,'HOLD')});
test('conflicting indexer blocks fail closed',()=>{const i=input();i.wallet.independentIndexerBlockHashes[1]='b'.repeat(64);assert.equal(assessNomniCollateral(i).status,'HOLD')});
test('invalid proof of control fails closed',()=>{const i=input();i.wallet.controlVerified=false;assert.equal(assessNomniCollateral(i).status,'HOLD')});
test('wrong asset fails closed',()=>{const i=input();i.asset='OTHER';assert.equal(assessNomniCollateral(i).status,'HOLD')});
