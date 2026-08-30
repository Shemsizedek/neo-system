import rolePolicy from './role-policy.json' with { type: 'json' };
import { createControlRecord } from './control-plane.mjs';
import { verifyDiscordInteraction } from './verify-interaction.mjs';

const PING = 1;
const APPLICATION_COMMAND = 2;

function configuredRoleIds(env) {
  return {
    viewer: new Set((env.NEO_VPN_DISCORD_VIEWER_ROLE_IDS ?? '').split(',').map(v => v.trim()).filter(Boolean)),
    operator: new Set((env.NEO_VPN_DISCORD_OPERATOR_ROLE_IDS ?? '').split(',').map(v => v.trim()).filter(Boolean)),
    admin: new Set((env.NEO_VPN_DISCORD_ADMIN_ROLE_IDS ?? '').split(',').map(v => v.trim()).filter(Boolean))
  };
}

function resolveRole(memberRoleIds, env) {
  const config = configuredRoleIds(env);
  const roles = new Set(memberRoleIds ?? []);

  if ([...config.admin].some(id => roles.has(id))) return 'admin';
  if ([...config.operator].some(id => roles.has(id))) return 'operator';
  if ([...config.viewer].some(id => roles.has(id))) return 'viewer';
  return null;
}

function commandAllowed(role, command) {
  if (!role) return false;
  return rolePolicy.roles[role]?.includes(command) ?? false;
}

function optionsToObject(options = []) {
  return Object.fromEntries(options.map(option => [
    option.name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()),
    option.value
  ]));
}

export function handleDiscordInteraction({ rawBody, headers, env = process.env, infrastructureLive = false }) {
  verifyDiscordInteraction({
    rawBody,
    signature: headers['x-signature-ed25519'],
    timestamp: headers['x-signature-timestamp'],
    publicKeyHex: env.DISCORD_PUBLIC_KEY
  });

  const interaction = JSON.parse(rawBody);
  if (interaction.type === PING) return { status: 200, body: { type: 1 } };
  if (interaction.type !== APPLICATION_COMMAND) return { status: 400, body: { error: 'unsupported-interaction-type' } };

  const command = interaction.data?.name;
  const role = resolveRole(interaction.member?.roles, env);
  if (!commandAllowed(role, command)) {
    return {
      status: 403,
      body: { type: 4, data: { content: 'Not authorized for this NEO VPN command.', flags: 64 } }
    };
  }

  const request = {
    command,
    discordUserId: interaction.member?.user?.id ?? interaction.user?.id,
    guildId: interaction.guild_id,
    channelId: interaction.channel_id,
    options: optionsToObject(interaction.data?.options)
  };

  const record = createControlRecord(request, infrastructureLive);
  return {
    status: 200,
    body: {
      type: 4,
      data: {
        content: `NEO VPN request ${record.correlationId}: ${record.state}`,
        flags: 64
      }
    },
    controlRecord: record,
    resolvedRole: role
  };
}
