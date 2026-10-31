import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateMarketDepth,authorizeProfessionalView,assembleEvidenceManifest} from './market-portal.mjs';
const now=Date.UTC(2026,9,31);const book={asset:'NOMNI',quote:'BTC',venue:'MOCK',sourceId:'MOCK',timestamp:now,
 bids:[{priceBtc:.00002,quantity:40},{priceBtc:.00001,quantity:60}]};
test('multiple bid levels produce depth-weighted proceeds',()=>{const r=evaluateMarketDepth({book,quantity:100,btcUsd:70000,observedAt:now});assert.equal(r.status,'INDICATIVE_DEPTH_COVERED');assert.equal(r.authenticatedVenue,false)});
test('insufficient executable depth fails',()=>assert.equal(evaluateMarketDepth({book,quantity:101,btcUsd:70000,observedAt:now}).status,'HOLD'));
test('stale market data fails',()=>assert.equal(evaluateMarketDepth({book,quantity:10,btcUsd:70000,observedAt:now+400000}).status,'HOLD'));
test('unsorted order book fails',()=>assert.equal(evaluateMarketDepth({book:{...book,bids:[...book.bids].reverse()},quantity:100,btcUsd:70000,observedAt:now}).status,'HOLD'));
const identity={authenticated:true,professionalRegistryVerified:true,mfaVerified:true,role:'underwriter',caseGrants:['CASE-123'],confidentialAccess:true};
test('authorized professional sees approved read-only section',()=>assert.equal(authorizeProfessionalView({identity,caseRecord:{id:'CASE-123',classification:'CONFIDENTIAL'},section:'market'}).status,'READ_ONLY_AUTHORIZED'));
test('unlicensed person denied',()=>assert.equal(authorizeProfessionalView({identity:{...identity,professionalRegistryVerified:false},caseRecord:{id:'CASE-123'},section:'market'}).status,'HOLD'));
test('unauthorized case denied',()=>assert.equal(authorizeProfessionalView({identity,caseRecord:{id:'CASE-OTHER'},section:'market'}).status,'HOLD'));
test('manifest is unsigned evidence not attestation',()=>{const r=assembleEvidenceManifest({caseId:'CASE-123',chain:{evidenceDigest:'abc'}});assert.equal(r.status,'UNSIGNED_MANIFEST');assert.equal(r.independentlyAttested,false)});
