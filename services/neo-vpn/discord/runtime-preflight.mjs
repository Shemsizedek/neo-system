const required = [
  'DISCORD_BOT_TOKEN',
  'DISCORD_APPLICATION_ID',
  'DISCORD_GUILD_ID',
  'NEO_VPN_DISCORD_VIEWER_ROLE_IDS',
  'NEO_VPN_DISCORD_OPERATOR_ROLE_IDS',
  'NEO_VPN_DISCORD_ADMIN_ROLE_IDS'
];

const snowflake = /^\d{17,20}$/;
const missing = [];
const invalid = [];

for (const name of required) {
  const value = process.env[name]?.trim();
  if (!value) missing.push(name);
}

for (const name of ['DISCORD_APPLICATION_ID', 'DISCORD_GUILD_ID']) {
  const value = process.env[name]?.trim();
  if (value && !snowflake.test(value)) invalid.push(name);
}

for (const name of [
  'NEO_VPN_DISCORD_VIEWER_ROLE_IDS',
  'NEO_VPN_DISCORD_OPERATOR_ROLE_IDS',
  'NEO_VPN_DISCORD_ADMIN_ROLE_IDS'
]) {
  const values = (process.env[name] ?? '').split(',').map(v => v.trim()).filter(Boolean);
  if (values.some(value => !snowflake.test(value))) invalid.push(name);
}

if (missing.length || invalid.length) {
  console.error(JSON.stringify({
    event: 'neo-vpn-discord-runtime-preflight',
    ok: false,
    missing,
    invalid
  }));
  process.exit(1);
}

console.log(JSON.stringify({
  event: 'neo-vpn-discord-runtime-preflight',
  ok: true,
  guildId: process.env.DISCORD_GUILD_ID,
  infrastructureLive: process.env.NEO_VPN_INFRASTRUCTURE_LIVE === 'true'
}));
