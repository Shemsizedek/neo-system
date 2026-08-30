import {
  Client,
  Events,
  GatewayIntentBits,
  REST,
  Routes
} from 'discord.js';
import fs from 'node:fs/promises';
import rolePolicy from './role-policy.json' with { type: 'json' };
import { createControlRecord } from './control-plane.mjs';

const required = ['DISCORD_BOT_TOKEN', 'DISCORD_APPLICATION_ID', 'DISCORD_GUILD_ID'];
for (const name of required) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required`);
}

const token = process.env.DISCORD_BOT_TOKEN.trim();
const applicationId = process.env.DISCORD_APPLICATION_ID.trim();
const guildId = process.env.DISCORD_GUILD_ID.trim();

const roleSets = {
  viewer: new Set((process.env.NEO_VPN_DISCORD_VIEWER_ROLE_IDS ?? '').split(',').map(v => v.trim()).filter(Boolean)),
  operator: new Set((process.env.NEO_VPN_DISCORD_OPERATOR_ROLE_IDS ?? '').split(',').map(v => v.trim()).filter(Boolean)),
  admin: new Set((process.env.NEO_VPN_DISCORD_ADMIN_ROLE_IDS ?? '').split(',').map(v => v.trim()).filter(Boolean))
};

function resolveRole(memberRoleIds = []) {
  const roles = new Set(memberRoleIds);
  if ([...roleSets.admin].some(id => roles.has(id))) return 'admin';
  if ([...roleSets.operator].some(id => roles.has(id))) return 'operator';
  if ([...roleSets.viewer].some(id => roles.has(id))) return 'viewer';
  return null;
}

function allowed(role, command) {
  return Boolean(role && rolePolicy.roles[role]?.includes(command));
}

function optionsFromInteraction(interaction) {
  const result = {};
  for (const option of interaction.options?.data ?? []) {
    result[option.name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = option.value;
  }
  return result;
}

async function registerGuildCommands() {
  const commands = JSON.parse(
    await fs.readFile(new URL('./application-commands.json', import.meta.url), 'utf8')
  );
  const rest = new REST({ version: '10' }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: commands });
  console.log(JSON.stringify({ event: 'discord-commands-registered', guildId, count: commands.length }));
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, async readyClient => {
  console.log(JSON.stringify({ event: 'discord-gateway-ready', userId: readyClient.user.id, guildId }));
  await registerGuildCommands();
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.guildId !== guildId) {
    await interaction.reply({ content: 'NEO VPN commands are restricted to the configured guild.', ephemeral: true });
    return;
  }

  const memberRoles = interaction.member?.roles?.cache
    ? [...interaction.member.roles.cache.keys()]
    : Array.isArray(interaction.member?.roles) ? interaction.member.roles : [];
  const role = resolveRole(memberRoles);
  const command = interaction.commandName;

  if (!allowed(role, command)) {
    await interaction.reply({ content: 'Not authorized for this NEO VPN command.', ephemeral: true });
    return;
  }

  try {
    const record = createControlRecord({
      command,
      discordUserId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      options: optionsFromInteraction(interaction)
    }, false);

    console.log(JSON.stringify({
      event: 'neo-vpn-control-request',
      correlationId: record.correlationId,
      command: record.command,
      actor: record.actor.discordUserId,
      role,
      state: record.state,
      target: record.target
    }));

    const note = record.state === 'pending-infrastructure'
      ? 'Discord control plane is online; VPN data-plane execution is not enabled.'
      : 'Request accepted into the approval policy.';

    await interaction.reply({
      content: `NEO VPN request ${record.correlationId}: ${record.state}. ${note}`,
      ephemeral: true
    });
  } catch (error) {
    console.error(JSON.stringify({ event: 'neo-vpn-command-error', command, message: error.message }));
    const payload = { content: 'NEO VPN command rejected by the control policy.', ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
    else await interaction.reply(payload);
  }
});

client.on(Events.Error, error => {
  console.error(JSON.stringify({ event: 'discord-client-error', message: error.message }));
});

process.on('SIGINT', async () => {
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  client.destroy();
  process.exit(0);
});

await client.login(token);
