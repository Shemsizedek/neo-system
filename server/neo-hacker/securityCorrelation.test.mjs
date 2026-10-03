import test from 'node:test';
import assert from 'node:assert/strict';
import { correlateSecuritySignals, correlateNeoSecurityContext } from './securityCorrelation.mjs';

test('single source cannot self-confirm a security event', () => {
  const result = correlateSecuritySignals([
    { channel:'guardian-device', source:'guardian-phone-a', severity:'CRITICAL', state:'CONFIRMED_SECURITY_EVENT', confidence:0.99, evidence:'device anomaly' },
    { channel:'guardian-device', source:'guardian-phone-a', severity:'CRITICAL', state:'CONFIRMED_SECURITY_EVENT', confidence:0.99, evidence:'repeated device anomaly' },
  ]);
  assert.equal(result.independentlyCorroborated, false);
  assert.equal(result.state, 'SUSPICION');
  assert.ok(result.confidence <= 0.69);
  assert.equal(result.canAuthorizeTools, false);
});

test('two independent channels and sources may corroborate but never authorize action', () => {
  const result = correlateSecuritySignals([
    { channel:'guardian-device', source:'guardian-phone-a', severity:'HIGH', state:'SUSPICION', confidence:0.8, evidence:'VPN dropped unexpectedly' },
    { channel:'device-attestation', source:'neo-hacker-attestation-a', severity:'HIGH', state:'SUSPICION', confidence:0.86, evidence:'attestation drift detected' },
  ]);
  assert.equal(result.independentlyCorroborated, true);
  assert.equal(result.state, 'CONFIRMED_SECURITY_EVENT');
  assert.equal(result.priority, 'HIGH_REVIEW');
  assert.equal(result.canAuthorizeTools, false);
  assert.equal(result.canMutateInfrastructure, false);
  assert.equal(result.requiresHumanAuthorizationForConsequentialAction, true);
});

test('NEO context correlates device, infrastructure, GitHub, attestation, and history without forcing confirmation', () => {
  const result = correlateNeoSecurityContext({
    guardian:[{ source:'guardian-phone-a', severity:'MEDIUM', state:'SUSPICION', confidence:0.6, evidence:'network changed' }],
    github:[{ source:'github-actions', severity:'INFO', state:'OBSERVATION', confidence:0.95, evidence:'canonical deployment healthy' }],
    infrastructure:[{ source:'neo-domain-health', severity:'LOW', state:'OBSERVATION', confidence:0.9, evidence:'custom domain healthy' }],
  });
  assert.equal(result.independentChannelCount, 3);
  assert.equal(result.state, 'SUSPICION');
  assert.equal(result.canDeploy, false);
});

test('empty context remains an observation with no authority', () => {
  const result = correlateNeoSecurityContext();
  assert.equal(result.state, 'OBSERVATION');
  assert.equal(result.confidence, 0);
  assert.equal(result.canPersist, false);
});
