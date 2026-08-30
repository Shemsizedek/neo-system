const env = process.env;
const scope = env.DISCORD_REGISTRATION_SCOPE ?? 'guild';
const snowflake = /^\d{17,20}$/;
const publicKey = /^[0-9a-fA-F]{64}$/;

const failures = [];
const checks = [];

function requireValue(name, predicate = value => Boolean(value)) {
  const value = env[name]?.trim() ?? '';
  if (!value) {
    failures.push(`${name}: missing`);
    return '';
  }
  if (!predicate(value)) failures.push(`${name}: invalid format`);
  else checks.push(`${name}: configured`);
  return value;
}

requireValue('DISCORD_APPLICATION_ID', value => snowflake.test(value));
requireValue('DISCORD_BOT_TOKEN');
requireValue('DISCORD_PUBLIC_KEY', value => publicKey.test(value));

if (scope === 'guild') {
  requireValue('DISCORD_GUILD_ID', value => snowflake.test(value));
} else if (scope !== 'global') {
  failures.push(`DISCORD_REGISTRATION_SCOPE: unsupported value ${scope}`);
}

for (const name of [
  'NEO_VPN_DISCORD_VIEWER_ROLE_IDS',
  'NEO_VPN_DISCORD_OPERATOR_ROLE_IDS',
  'NEO_VPN_DISCORD_ADMIN_ROLE_IDS'
]) {
  const value = requireValue(name);
  if (value) {
    const ids = value.split(',').map(v => v.trim()).filter(Boolean);
    if (!ids.length || ids.some(id => !snowflake.test(id))) {
      failures.push(`${name}: must contain comma-separated Discord role IDs`);
    }
  }
}

const endpoint = requireValue('DISCORD_INTERACTIONS_ENDPOINT_URL', value => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.pathname.endsWith('/api/neo-vpn-discord');
  } catch {
    return false;
  }
});

if (endpoint) checks.push('Interaction endpoint: HTTPS route shape valid');

console.log('NEO VPN Discord activation preflight');
for (const check of checks) console.log(`PASS ${check}`);

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`Activation blocked: ${failures.length} requirement(s) unresolved.`);
  process.exit(1);
}

console.log(`READY Discord ${scope} registration prerequisites are configured.`);
console.log('NEXT Register commands, set the Discord Interactions Endpoint URL, then require a signed Discord PING before declaring the control plane live.');
