import test from 'node:test';
import assert from 'node:assert/strict';
import { loadProviderPolicy, candidateAssessment, planProviderSwitch, classifyNeoIpEvidence } from '../federation/provider-policy.mjs';

const policy = loadProviderPolicy();
const good = {
  accountAuthorized:true, termsAccepted:true, zeroAdditionalCostConfirmed:true,
  transportEncryptionVerified:true, accessPolicyVerified:true, revocationVerified:true,
  independentPeersVerified:true, reachable:true, active:true,
  quotaExhausted:false, paymentRequired:false
};

test('no candidate is considered live just because it appears in the static free roster',()=>{
  const r=candidateAssessment(policy);
  assert.equal(r.length,3);
  assert.equal(r.some(x=>x.evidenceQualified),false);
  assert.ok(r.every(x=>x.liveConnectionCertified===false));
  assert.deepEqual(r.map(x=>x.id),['netbird-cloud-free','neo-owned-community-peer','oracle-always-free']);
});

test('commercial network does not default to personal-only free tiers',()=>{
  assert.equal(policy.non_gateway_surfaces.some(x=>x.id==='tailscale-personal'),true);
  assert.equal(policy.non_gateway_surfaces.some(x=>x.id==='zerotier-personal'),true);
  assert.equal(policy.candidates.some(x=>x.id==='tailscale-personal'||x.id==='zerotier-personal'),false);
});

test('transport candidates preserve NEO 10.144/16 distinct from NetBird CGNAT',()=>{
  assert.equal(policy.canonical_neo_private_overlay,'10.144.0.0/16');
  assert.match(policy.candidates[0].native_overlay,/100\.64\.0\.0\/10/);
  assert.equal(classifyNeoIpEvidence({netbirdPeerIp:'100.64.1.23'}).neo_private_subnet_reachable,false);
  assert.equal(classifyNeoIpEvidence({netbirdPeerIp:'100.127.254.2'}).netbird_provider_overlay,'CGNAT_FORMAT_ONLY');
  for(const invalid of ['10.144.50.10','100.128.0.1','100.64.999.1','100.64.01.1','']) {
    assert.equal(classifyNeoIpEvidence({netbirdPeerIp:invalid}).netbird_provider_overlay,'NOT_VERIFIED');
  }
  const approved = classifyNeoIpEvidence({netbirdPeerIp:'100.64.10.10',neoRoutedSubnetVerified:true,routeAclVerified:true,independentGatewayVerified:true});
  assert.equal(approved.neo_private_subnet_reachable,true);
  assert.equal(approved.public_routable_ip_allocated,false);
});

test('zero signed-up platforms yields no fabricated production failover',()=>{
  const r=planProviderSwitch({policy,event:'commission'});
  assert.equal(r.state,'BLOCKED_NO_VERIFIED_STANDBY');
  assert.equal(r.live_network_claim,false);
});

test('free quota exhaustion excludes a provider, not a reason to circumvent the account limit',()=>{
  const evidenceById={
    'netbird-cloud-free':{...good,quotaExhausted:true},
    'neo-owned-community-peer':{...good}
  };
  const result=planProviderSwitch({policy,currentProviderId:'netbird-cloud-free',event:'quota_exhausted',evidenceById});
  assert.equal(result.state,'REVIEW_REQUIRED');
  assert.equal(result.proposed_provider,'neo-owned-community-peer');
  assert.equal(result.live_network_claim,false);
});

test('even an authorized migration produces a plan only, never cloud or VPN mutation',()=>{
  const r=planProviderSwitch({policy, migrationAuthorized:true,evidenceById:{'netbird-cloud-free':good}});
  assert.equal(r.state,'AUTHORIZED_CUTOVER_PLAN_ONLY');
  assert.equal(r.action,'STAGE_VALIDATE_THEN_EXPLICITLY_CUT_OVER');
  assert.equal(r.live_network_claim,false);
});

test('provider switch fails closed on unknown event or wrong NEO overlay',()=>{
  assert.throws(()=>planProviderSwitch({policy,event:'auto_purchase'}),/unsupported_provider_switch_event/);
  assert.throws(()=>candidateAssessment({...policy,canonical_neo_private_overlay:'100.64.0.0/10'}),/neo_overlay_must_remain/);
});

test('a provider with payment required or missing revocation cannot become qualified',()=>{
  const a=candidateAssessment(policy,{
    'netbird-cloud-free':{...good,paymentRequired:true},
    'oracle-always-free':{...good,revocationVerified:false}
  });
  assert.equal(a.filter(x=>x.evidenceQualified).length,0);
});
