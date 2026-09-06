import { readRuntimeState } from './runtime-state.mjs';

export function evaluateAcceptance(state, env = process.env) {
  const expectedGuildId = String(env.DISCORD_GUILD_ID ?? '').trim();
  const infrastructureLive = String(env.NEO_VPN_INFRASTRUCTURE_LIVE ?? 'false').toLowerCase() === 'true';
  const failures = [];

  if (state.status !== 'online') failures.push(`status:${state.status ?? 'missing'}`);
  if (!state.gatewayConnected) failures.push('gateway:not-connected');
  if (!state.guildAttested) failures.push('guild:not-attested');
  if (!state.commandsRegistered) failures.push('commands:not-registered');
  if (expectedGuildId && state.guildId !== expectedGuildId) failures.push('guild:id-mismatch');

  const registrationReady = failures.length === 0;
  const executionReady = registrationReady && infrastructureLive;

  return {
    ok: registrationReady,
    registrationReady,
    executionReady,
    infrastructureLive,
    guildId: state.guildId ?? null,
    commandCount: state.commandCount ?? 0,
    attestationSummary: state.attestationSummary ?? null,
    updatedAt: state.updatedAt ?? null,
    failures
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const state = await readRuntimeState();
  const result = evaluateAcceptance(state);
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}
