import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAcceptance } from './acceptance-probe.mjs';

const readyState = {
  status: 'online',
  gatewayConnected: true,
  guildAttested: true,
  commandsRegistered: true,
  guildId: '123456789012345678',
  commandCount: 6,
  attestationSummary: 'verified roles=3 channels=1'
};

test('registration acceptance passes while execution stays disabled by default', () => {
  const result = evaluateAcceptance(readyState, {
    DISCORD_GUILD_ID: readyState.guildId,
    NEO_VPN_INFRASTRUCTURE_LIVE: 'false'
  });
  assert.equal(result.ok, true);
  assert.equal(result.registrationReady, true);
  assert.equal(result.executionReady, false);
  assert.deepEqual(result.failures, []);
});

test('execution acceptance requires explicit infrastructure live flag', () => {
  const result = evaluateAcceptance(readyState, {
    DISCORD_GUILD_ID: readyState.guildId,
    NEO_VPN_INFRASTRUCTURE_LIVE: 'true'
  });
  assert.equal(result.executionReady, true);
});

test('fails closed when guild attestation or registration is missing', () => {
  const result = evaluateAcceptance({
    ...readyState,
    guildAttested: false,
    commandsRegistered: false
  }, { DISCORD_GUILD_ID: readyState.guildId });
  assert.equal(result.ok, false);
  assert.match(result.failures.join(','), /guild:not-attested/);
  assert.match(result.failures.join(','), /commands:not-registered/);
});

test('fails closed on configured guild mismatch', () => {
  const result = evaluateAcceptance(readyState, {
    DISCORD_GUILD_ID: '999999999999999999'
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.failures, ['guild:id-mismatch']);
});
