import test from 'node:test';
import assert from 'node:assert/strict';

import { getPlatformCapabilities, normalizePlatformEvent } from './social-platform-adapters.mjs';
import { buildIncidentTimeline, correlateIncidents } from './social-incident-timeline.mjs';

test('platform adapters accept only official API or user-authorized export sources', () => {
  assert.throws(() => normalizePlatformEvent({platform:'x',sourceType:'SCRAPED',signalType:'PROFILE_CHANGE'}), /unsupported_source_type/);
  assert.throws(() => normalizePlatformEvent({platform:'x',sourceType:'OFFICIAL_API',signalType:'PROFILE_CHANGE',sessionToken:'secret'}), /secret_material_rejected/);
  const caps = getPlatformCapabilities('instagram');
  assert.equal(caps.credentialsAccepted, false);
  assert.equal(caps.sessionTokensAccepted, false);
  assert.equal(caps.accessControlBypassAllowed, false);
});

test('platform adapters normalize supported signals without mutating platform state', () => {
  const result = normalizePlatformEvent({
    platform:'facebook',
    sourceType:'OFFICIAL_API',
    accountRef:'acct-1',
    signalType:'ADMIN_ROLE_CHANGE',
    sourceEventId:'evt-123',
    summary:'admin role changed'
  });
  assert.equal(result.accepted, true);
  assert.equal(result.mutatesPlatform, false);
  assert.equal(result.event.platform, 'facebook');
  assert.equal(result.event.state, 'SUSPICION');
  assert.equal(result.event.instructionPolicy, 'DATA_ONLY_NO_EXECUTION');
});

test('unsupported telemetry is reported as a limitation instead of invented evidence', () => {
  const result = normalizePlatformEvent({
    platform:'tiktok',
    sourceType:'OFFICIAL_API',
    accountRef:'acct-1',
    signalType:'LOGIN_OR_SESSION_CHANGE'
  });
  assert.equal(result.accepted, false);
  assert.equal(result.telemetryLimitation, true);
});

test('incident timeline remains evidence-first and non-executable', () => {
  const observed = normalizePlatformEvent({
    platform:'instagram', sourceType:'USER_AUTHORIZED_EXPORT', accountRef:'acct-1', signalType:'PROFILE_CHANGE', summary:'bio changed'
  }).event;
  const corroborated = normalizePlatformEvent({
    platform:'facebook', sourceType:'OFFICIAL_API', accountRef:'acct-1', signalType:'ADMIN_ROLE_CHANGE', summary:'admin changed', corroborated:true
  }).event;
  const timeline = buildIncidentTimeline([corroborated, observed]);
  assert.equal(timeline.highestState, 'CORROBORATED_SECURITY_EVENT');
  assert.equal(timeline.events.every((e) => e.executable === false), true);
  assert.equal(timeline.attributionPolicy, 'NO_PERSON_OR_ORGANIZATION_ATTRIBUTION_WITHOUT_RELIABLE_EVIDENCE');
});

test('correlation does not become attribution', () => {
  const events = [
    normalizePlatformEvent({platform:'x',sourceType:'OFFICIAL_API',accountRef:'acct-1',signalType:'PROFILE_CHANGE',summary:'name changed'}).event,
    normalizePlatformEvent({platform:'x',sourceType:'OFFICIAL_API',accountRef:'acct-1',signalType:'PROFILE_CHANGE',summary:'avatar changed'}).event
  ];
  const groups = correlateIncidents(events);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].eventCount, 2);
  assert.equal(groups[0].inferencePolicy, 'CORRELATION_IS_NOT_ATTRIBUTION');
});
