import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {NOMNI_USD_TARGET, assessNomniUsdBacking} from './usd-reserve-gate.mjs';

const nowUtc='2026-10-29T16:00:00Z';
const keys=[
  'issuerAuthorization','counterpartySupplyReconciliation','preexistingHolderRightsReview',
  'reserveCustodianVerification','reserveSegregationVerification',
  'independentReserveAttestation','redemptionRightsAndTimetable',
  'financialComplianceReview','governanceReleaseApproval',
];
const evidenceRefs=Object.fromEntries(keys.map(k=>[k,'evidence:project144/'+k]));
const complete={
  asset:'NOMNI',network:'bitcoin-counterparty',targetRedemptionUsdPerNomni:'1.00',
  reportedOutstandingNomni:'1000.00000001',reportedSegregatedUsdCash:'1000.01',
  supplyAsOfUtc:'2026-10-29T15:00:00Z',reserveAsOfUtc:'2026-10-29T15:00:00Z',
  evidenceRefs,
};
const options={nowUtc};

test('objective is proposed only; all live operations stay disabled',()=>{
  assert.equal(NOMNI_USD_TARGET.targetRedemptionUsdPerNomni,'1.00');
  assert.equal(NOMNI_USD_TARGET.network,'bitcoin-counterparty');
  assert.equal(NOMNI_USD_TARGET.status,'PROPOSED_NOT_LIVE');
  for(const field of ['onchainAssetChangeAuthorized','issuanceAuthorized','redemptionAuthorized',
    'marketingAuthorized','coinbaseNomniIntegrationAuthorized']) assert.equal(NOMNI_USD_TARGET[field],false);
  assert.equal(assessNomniUsdBacking({},options).readiness,'BLOCKED');
});

test('calculates exact liability ceiling for one-cent rounding, never floats',()=>{
  const result=assessNomniUsdBacking(complete,options);
  assert.equal(result.reportedRequiredReserveCents,'100001');
  assert.equal(result.reportedCashReserveCents,'100001');
  assert.equal(result.reportedShortfallCents,'0');
  assert.equal(result.readiness,'PENDING_INDEPENDENT_VERIFICATION');
  assert.equal(result.reserveEvidenceVerified,false);
  assert.equal(result.issuerAuthorizationVerified,false);
  assert.equal(result.issuanceAuthorized,false);
  assert.equal(result.redemptionAuthorized,false);
});

test('no under-reserve on fractional NOMNI liability',()=>{
  const result=assessNomniUsdBacking({
    ...complete,reportedOutstandingNomni:'1.00000001',reportedSegregatedUsdCash:'1.00',
  },options);
  assert.equal(result.reportedRequiredReserveCents,'101');
  assert.equal(result.reportedShortfallCents,'1');
  assert.ok(result.missing.includes('reportedOneToOneReserveCoverage'));
});

test('reconciles ALL outstanding tokens rather than assuming only circulation',()=>{
  const result=assessNomniUsdBacking({
    ...complete,reportedOutstandingNomni:'1000000',reportedSegregatedUsdCash:'250000.00',
  },options);
  assert.equal(result.reportedShortfallCents,'75000000');
  assert.equal(result.readiness,'BLOCKED');
});

test('rejects invalid decimals and 1:1 declarations without proof',()=>{
  for(const reportedOutstandingNomni of ['1e8','-1','Infinity','1.000000001',1.2,'','001']) {
    const result=assessNomniUsdBacking({...complete,reportedOutstandingNomni},options);
    assert.ok(result.missing.includes('completeOutstandingNomniSupply'));
  }
  for(const reportedSegregatedUsdCash of ['1.001',-1,'1e2','not real']) {
    const result=assessNomniUsdBacking({...complete,reportedSegregatedUsdCash},options);
    assert.ok(result.missing.includes('segregatedUsdCashStatement'));
  }
});

test('missing or stale evidence blocks stable-value readiness',()=>{
  for(const variant of [
    {network:'ethereum'},
    {network:'base'},
    {targetRedemptionUsdPerNomni:'1'},
    {supplyAsOfUtc:'2026-10-20T15:00:00Z'},
    {reserveAsOfUtc:'2026-10-30T15:00:00Z'},
    {evidenceRefs:{}},
  ]) {
    const result=assessNomniUsdBacking({...complete,...variant},options);
    assert.equal(result.readiness,'BLOCKED');
    assert.equal(result.marketingAuthorized,false);
  }
});

test('does not allow NEO credentials, account data or vendor identifiers',()=>{
  for(const extra of [
    {coinbaseKey:'secret'}, {customerProfile:{}},{walletSeed:'secret'},{bankAccountNumber:'123'},
  ]) {
    assert.throws(()=>assessNomniUsdBacking({...complete,...extra},options),/Unapproved snapshot fields/);
  }
});

test('reserve gate cannot itself connect to networks, issue or move NOMNI',async()=>{
  const source=await readFile(new URL('./usd-reserve-gate.mjs', import.meta.url),'utf8');
  assert.doesNotMatch(source, /\b(?:fetch|WebSocket|process\.env|createServer|require)\s*\(|\bimport\s*\(/);
  assert.doesNotMatch(source, /\bfrom\s*['"](?:coinbase|ethers|viem|@coinbase)/);
});
