import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcilePropertyMarketing,compareNomniExplorerObservations,decideGate006} from './evidence-reconciliation.mjs';

const url='https://www.crexi.com/properties/1985353/texas-8-cap-rate-multi-family-property';
const observedAt='2026-11-08T10:00:00Z';
test('seller-stated cap yields implied NOI but never verified NOI or a price reduction',()=>{
 const r=reconcilePropertyMarketing([{url,observedAt,askingPriceUsd:1750000,capRateBasisPoints:800}]);
 assert.equal(r.observations[0].impliedNoiUsd,'140000.00');
 assert.equal(r.validatedNoi,false);assert.equal(r.verifiedPriceReduction,false);assert.equal(r.status,'MARKETING-ONLY');
});
test('Dixie 7% versus 8% is a marketing discrepancy, not proof of real earnings',()=>{
 const r=reconcilePropertyMarketing([
  {url,observedAt,askingPriceUsd:1750000,capRateBasisPoints:700},
  {url:'https://example.com/older-listing',observedAt:'2026-10-20T10:00:00Z',askingPriceUsd:1750000,capRateBasisPoints:800}
 ]);
 assert.equal(r.observations[0].impliedNoiUsd,'122500.00');
 assert.ok(r.alerts.includes('stated-cap-rates-differ-across-observations'));
 assert.equal(r.validatedNoi,false);
});
test('historical Contempo NOI and earlier OM cap reconcile only mathematically',()=>{
 const r=reconcilePropertyMarketing([
  {url:'https://example.com/old-om',observedAt:'2026-10-20T10:00:00Z',askingPriceUsd:2775000,capRateBasisPoints:612,reportedNoiUsd:169843},
  {url:'https://www.crexi.com/properties/2522761/texas-contempo-apartments',observedAt,askingPriceUsd:2749000,capRateBasisPoints:null}
 ]);
 assert.equal(r.observations[0].impliedNoiUsd,'169830.00');
 assert.equal(r.observations[0].reportedNoiUsd,'169843.00');
 assert.equal(r.observations[1].impliedNoiUsd,null);
 assert.ok(r.alerts.includes('asking-prices-differ-across-observations'));
 assert.equal(r.verifiedPriceReduction,false);
});
test('missing URL, bad time, noninteger asking price and cap are rejected',()=>{
 assert.throws(()=>reconcilePropertyMarketing([]));
 assert.throws(()=>reconcilePropertyMarketing([{url:'javascript:alert(1)',observedAt,askingPriceUsd:1750000}]));
 assert.throws(()=>reconcilePropertyMarketing([{url,observedAt:'yesterday',askingPriceUsd:1750000}]));
 assert.throws(()=>reconcilePropertyMarketing([{url,observedAt,askingPriceUsd:1750000.01}]));
 assert.throws(()=>reconcilePropertyMarketing([{url,observedAt,askingPriceUsd:1750000,capRateBasisPoints:15000}]));
});
test('independent published NOMNI supply and lock agree without becoming a node audit',()=>{
 const r=compareNomniExplorerObservations({
  project:{url:'https://github.com/Shemsizedek/neo-system/blob/main/server/neo-edge/server.mjs',supply:900000000,divisible:false,locked:true},
  independentExplorer:{url:'https://horizon.market/assets/NOMNI',supply:900000000,divisible:false,locked:true}
 });
 assert.equal(r.agreements.supply,'PUBLISHED-AGREEMENT');assert.equal(r.agreements.locked,'PUBLISHED-AGREEMENT');
 assert.equal(r.genesisOrIssuanceTxConfirmed,false);assert.equal(r.reservesVerified,false);
 assert.equal(r.certification,'NOT-CERTIFIED');
});
test('published NOMNI field conflict is surfaced, unknown fields not guessed',()=>{
 const r=compareNomniExplorerObservations({
  project:{url:'https://example.com/nomni',supply:900000000,divisible:false},
  independentExplorer:{url:'https://horizon.market/assets/NOMNI',supply:900000001,locked:true}
 });
 assert.equal(r.agreements.supply,'CONFLICT');assert.equal(r.agreements.locked,'UNKNOWN');
});
test('same-origin evidence cannot masquerade as independent published agreement',()=>{
 assert.throws(()=>compareNomniExplorerObservations({project:{url:'https://example.com/a'},independentExplorer:{url:'https://example.com/b'}}),/Distinct/);
});
test('no evidence means NO grants, NO securities issues and NO government contracts',()=>{
 const r=decideGate006({propertyPackets:[{id:'DIXIE'}]});
 assert.ok(r.property[0].missing.includes('siteControl'));
 assert.ok(r.issuer.missing.includes('signedResolution'));
 assert.ok(r.government.missing.includes('independentNodeSnapshot'));
 assert.equal(r.acquisitionAuthorized,false);assert.equal(r.grantApplicationReady,false);
 assert.equal(r.securitiesIssuanceAuthorized,false);assert.equal(r.governmentContractAwarded,false);
});
test('even forged reviewer flags cannot become approval from code alone',()=>{
 const docs=['ownerAuthority','siteControl','title','rentRoll','trailing12','insurance','taxHistory','flood','funding'];
 const issued=['goodStanding','ownerConsent','signedResolution','capTable','rightsAgreement','assetTx','counselMemo'];
 const gov=['independentNodeSnapshot','custodianAuthority','balanceVarianceTest','securityReview','agencyScope','vendorCredentials'];
 const claims=xs=>Object.fromEntries(xs.map(x=>[x,{sourceUrl:'https://example.com/claimed',reviewerId:'claim',authenticityReviewId:'claim'}]));
 const r=decideGate006({propertyPackets:[{id:'fake',documents:claims(docs)}],issuerPacket:claims(issued),pilotEvidence:claims(gov)});
 assert.deepEqual(r.property[0].missing,[]);assert.deepEqual(r.issuer.missing,[]);assert.deepEqual(r.government.missing,[]);
 assert.equal(r.status,'HOLD-BINDING-ACTIVITY');assert.equal(r.reserveCertified,false);
});
