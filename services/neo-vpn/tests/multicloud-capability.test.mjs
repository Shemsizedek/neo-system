import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyPlatform, qualifyGateway, proposeFederation} from '../federation/multicloud-capability.mjs';

const allPass = {
  operatorAuthorizationConfirmed:true, machineOnlineIndependentlyObserved:true,
  persistentPowerAndComputeVerified:true, independentUplinkVerified:true,
  usableKernelOrSupportedNetBirdTransportVerified:true,
  networkResourceReachabilityVerified:true, actualRecentEncryptedHandshakeObserved:true,
  permittedPrivateTrafficVerified:true, unauthorizedTrafficDenied:true,
  revocationVerified:true, approvedBudgetConfirmed:true, failureDomainVerified:true
};

test('Render HTTP, Neon, AI API and CI machines are not VPN endpoints',()=>{
  for(const kind of ['render-web','render-static','neon-postgres','github-actions',
      'github-codespaces','gitlab-ci','vercel-functions','ai-api','android-termux','netbird-client']){
    const classification=classifyPlatform(kind);
    assert.equal(classification.standalone_vpn_gateway_supported,false);
    assert.equal(qualifyGateway({kind,evidence:allPass}).gateway_live_certified,false);
    assert.equal(qualifyGateway({kind,evidence:allPass}).assessment,'HOLD_NOT_QUALIFIED');
  }
});

test('a dedicated host missing real operator authorization stays on hold',()=>{
  const evidence={...allPass,operatorAuthorizationConfirmed:false};
  const q=qualifyGateway({kind:'dedicated-linux',evidence});
  assert.equal(q.assessment,'HOLD_NOT_QUALIFIED');
  assert.ok(q.missing_evidence.some(x=>x.includes('OPERATOR_AUTHORIZATION')));
});

test('a hypothetical complete evidence form still cannot certify a gateway',()=>{
  const q=qualifyGateway({kind:'dedicated-linux',evidence:allPass,
    api_key:'SECRET_KEY',ip:'PRIVATE_IP'});
  assert.equal(q.assessment,'SELF_REPORTED_READY_FOR_INDEPENDENT_MANUAL_REVIEW');
  assert.equal(q.gateway_live_certified,false);
  assert.equal(q.independent_acceptance_attested,false);
  assert.equal(q.production_route_authorized,false);
  assert.ok(!JSON.stringify(q).includes('PRIVATE_IP'));
  assert.ok(!JSON.stringify(q).includes('SECRET_KEY'));
});

test('four layers of cloud tooling never imply VPN failover or bandwidth bonding',()=>{
  const p=proposeFederation({surfaces:['render-web','github-actions','gitlab-ci',
    'neon-postgres','ai-api','vercel-functions','netbird-client']});
  assert.equal(p.gateway_candidates_review_eligible_by_self_report,0);
  assert.equal(p.redundancy,'NOT_ATTESTED');
  assert.equal(p.failover,'NOT_ATTESTED');
  assert.equal(p.bandwidth_bonding,'NOT_CONFIGURED');
  assert.equal(p.deployment_performed,false);
  assert.equal(p.canonical_private_network,'10.144.0.0/16');
});

test('an offline Crown node cannot be qualified simply because it is enrolled',()=>{
  const p=proposeFederation({candidates:[{kind:'dedicated-linux',
    evidence:{...allPass,machineOnlineIndependentlyObserved:false}}]});
  assert.equal(p.gateway_candidates_on_hold,1);
  assert.equal(p.gateway_candidates_review_eligible_by_self_report,0);
});

test('unknown or malformed types fail closed and cannot echo untrusted input',()=>{
  const secret='neopass-private-key-secret';
  assert.equal(classifyPlatform(secret).kind,'UNRECOGNIZED');
  assert.equal(qualifyGateway({kind:secret,evidence:allPass}).gateway_live_certified,false);
  const p=proposeFederation({surfaces:[secret],candidates:[{kind:secret,evidence:{secret}}]});
  assert.equal(p.gateway_candidates_on_hold,1);
  assert.ok(!JSON.stringify(p).includes(secret));
  assert.throws(()=>proposeFederation({surfaces:'not-array'}),/INVALID_FEDERATION_INVENTORY/);
});

test('candidate count is not an independently validated failure-domain count',()=>{
  const p=proposeFederation({candidates:[
    {kind:'dedicated-linux',evidence:allPass},{kind:'dedicated-linux',evidence:allPass}
  ]});
  assert.equal(p.gateway_candidates_review_eligible_by_self_report,2);
  assert.equal(p.redundancy,'NOT_ATTESTED');
  assert.equal(p.platform_failover_action,'NONE');
});

test('null and too many inventory entries are denied',()=>{
  const r=proposeFederation();
  assert.equal(r.production_status,'HOLD_PENDING_INDEPENDENT_PHYSICAL_GATEWAY_AND_TWO_PEER_EVIDENCE');
  assert.throws(()=>proposeFederation({surfaces:new Array(101).fill('ai-api')}),/INVALID_FEDERATION_INVENTORY/);
  assert.throws(()=>proposeFederation({candidates:new Array(26).fill({kind:'dedicated-linux'})}),/INVALID_FEDERATION_INVENTORY/);
});
