const REQUIRED = [
  'DISCORD_APPLICATION_ID',
  'DISCORD_PUBLIC_KEY',
  'DISCORD_BOT_TOKEN',
  'DISCORD_GUILD_ID',
  'NEO_VPN_DISCORD_VIEWER_ROLE_IDS',
  'NEO_VPN_DISCORD_OPERATOR_ROLE_IDS',
  'NEO_VPN_DISCORD_ADMIN_ROLE_IDS',
  'NEO_VPN_DISCORD_INTERACTIONS_ENDPOINT'
];

const snowflake = /^\d{17,20}$/;
const publicKey = /^[0-9a-fA-F]{64}$/;

function roleIds(value) {
  return String(value ?? '').split(',').map(v => v.trim()).filter(Boolean);
}

export function evaluateDiscordLiveReadiness(env = process.env) {
  const missing = REQUIRED.filter(name => !String(env[name] ?? '').trim());
  const invalid = [];

  if (env.DISCORD_APPLICATION_ID && !snowflake.test(env.DISCORD_APPLICATION_ID)) invalid.push('DISCORD_APPLICATION_ID');
  if (env.DISCORD_GUILD_ID && !snowflake.test(env.DISCORD_GUILD_ID)) invalid.push('DISCORD_GUILD_ID');
  if (env.DISCORD_PUBLIC_KEY && !publicKey.test(env.DISCORD_PUBLIC_KEY)) invalid.push('DISCORD_PUBLIC_KEY');

  for (const name of ['NEO_VPN_DISCORD_VIEWER_ROLE_IDS','NEO_VPN_DISCORD_OPERATOR_ROLE_IDS','NEO_VPN_DISCORD_ADMIN_ROLE_IDS']) {
    if (env[name] && roleIds(env[name]).some(id => !snowflake.test(id))) invalid.push(name);
  }

  if (env.NEO_VPN_DISCORD_INTERACTIONS_ENDPOINT) {
    try {
      const url = new URL(env.NEO_VPN_DISCORD_INTERACTIONS_ENDPOINT);
      if (url.protocol !== 'https:' || !url.pathname.endsWith('/api/neo-vpn-discord')) invalid.push('NEO_VPN_DISCORD_INTERACTIONS_ENDPOINT');
    } catch {
      invalid.push('NEO_VPN_DISCORD_INTERACTIONS_ENDPOINT');
    }
  }

  const infrastructureLive = String(env.NEO_VPN_INFRASTRUCTURE_LIVE ?? 'false').toLowerCase() === 'true';
  return {
    readyForRegistration: missing.length === 0 && invalid.length === 0,
    readyForControlExecution: missing.length === 0 && invalid.length === 0 && infrastructureLive,
    missing,
    invalid,
    infrastructureLive
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const result = evaluateDiscordLiveReadiness();
  console.log(JSON.stringify(result, null, 2));
  if (!result.readyForRegistration) process.exit(1);
}
