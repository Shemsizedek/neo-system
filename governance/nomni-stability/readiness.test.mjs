import test from 'node:test';
import assert from 'node:assert/strict';
import {assessNomniStabilityProposal, assertNoPrematureNomniStablecoinClaim} from './readiness.mjs';

test('NOMNI is a Bitcoin/Counterparty asset, never assumed to be a stablecoin', () => {
  const state = assessNomniStabilityProposal();
  assert.equal(state.currentDesignation, 'currency-and-unit-of-account');
  assert.equal(state.readiness, 'blocked');
  assert.equal(state.mayIssue, false);
  assert.equal(state.mayMarketAsStablecoin, false);
  assert.equal(state.coinbaseAssetSupport, false);
});

test('refuses funding gaps, missing peg and non-Bitcoin networks', () => {
  const s = assessNomniStabilityProposal({asset:'NOMNI',network:'ethereum',outstandingNomni:'1000',usdReserveValue:'999'});
  assert.ok(s.missing.includes('verifiedCounterpartyAsset'));
  assert.ok(s.missing.includes('approvedPegDefinition'));
  assert.ok(s.missing.includes('fullReserveCoverage'));
});

test('even complete claimed evidence requires independent legal and reserve verification', () => {
  const keys=['issuerIdentity','redemptionPolicy','counterpartySupplySnapshot',
    'segregatedReserveStatement','independentReserveAttestation','legalIssuerAuthorization',
    'complianceAndConsumerDisclosures','governanceApproval'];
  const evidence=Object.fromEntries(keys.map(k=>[k,'documents/'+k+'.pdf']));
  const result=assessNomniStabilityProposal({
    asset:'NOMNI',network:'bitcoin-counterparty',peg:{currency:'USD',usdPerNomni:'1'},
    outstandingNomni:'1000.00000001',usdReserveValue:'1000.01',evidence,
  });
  assert.deepEqual(result.missing,[]);
  assert.equal(result.readiness,'pending-independent-legal-and-reserve-verification');
  assert.equal(result.mayIssue,false);
  assert.equal(result.mayMarketAsStablecoin,false);
});

test('exact decimal arithmetic rejects misleading float values and missing documents',()=>{
  const s=assessNomniStabilityProposal({
    asset:'NOMNI',network:'bitcoin-counterparty',peg:{currency:'USD',usdPerNomni:'1'},
    outstandingNomni:'1.00000001',usdReserveValue:'1.00',
  });
  assert.ok(s.missing.includes('fullReserveCoverage'));
  for(const bad of ['1e12',-1,1.4,'-1','Infinity','1.000000001']){
    const v=assessNomniStabilityProposal({outstandingNomni:bad});
    assert.ok(v.missing.includes('outstandingSupplyVerification'));
  }
});

test('blocks public claims before the issuer is approved and reserves proven',()=>{
  assert.equal(assertNoPrematureNomniStablecoinClaim({instrument_type:'currency',description:'NOMNI world currency on Bitcoin'}),true);
  for(const description of ['NOMNI Stablecoin','fully-backed NOMNI','USD-backed NOMNI','dollar-backed NOMNI','USD-pegged','1 NOMNI = $1']){
    assert.throws(()=>assertNoPrematureNomniStablecoinClaim({description}),/approval/);
  }
});
