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
import { readRuntimeState, writeRuntimeState } from './runtime-state.mjs';

const required = ['DISCORD_BOT_TOKEN', 'DISCORD_APPLICATION_ID', 'DISCORD_GUILD_ID'];
for (const name of required) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required`);
}

const token = process.env.DISCORD_BOT_TOKEN.trim();
const applicationId = process.env.DISCORD_APPLICATION_ID.trim();
const guildId = process.env.DISCORD_GUILD_ID.trim();
const infrastructureLive = process.env.NEO_VPN_INFRASTRUCTURE_LIVE === 'true';

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
  await writeRuntimeState({
    status: 'online',
    gatewayConnected: true,
    commandsRegistered: true,
    commandCount: commands.length,
    guildId,
    infrastructureLive
  });
  console.log(JSON.stringify({ event: 'discord-commands-registered', guildId, count: commands.length }));
}

async function statusMessage() {
  const state = await readRuntimeState();
  return [
    '**NEO VPN Discord Control Plane**',
    `Gateway: ${state.gatewayConnected ? 'online' : 'starting/offline'}`,
    `Guild commands: ${state.commandsRegistered ? `registered (${state.commandCount ?? 0})` : 'pending'}`,
    `Guild lock: ${state.guildId === guildId ? 'verified' : 'pending'}`,
    `VPN data plane: ${infrastructureLive ? 'enabled' : 'not enabled'}`,
    `Updated: ${state.updatedAt ?? 'not yet recorded'}`
  ].join('\n');
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

await writeRuntimeState({
  status: 'starting',
  gatewayConnected: false,
  commandsRegistered: false,
  guildId,
  infrastructureLive
});

client.once(Events.ClientReady, async readyClient => {
  await writeRuntimeState({
    status: 'online',
    gatewayConnected: true,
    botUserId: readyClient.user.id,
    guildId,
    infrastructureLive
  });
  console.log(JSON.stringify({ event: 'discord-gateway-ready', userId: readyClient.user.id, guildId }));
  try {
    await registerGuildCommands();
  } catch (error) {
    await writeRuntimeState({ status: 'degraded', commandsRegistered: false, lastError: 'command-registration-failed' });
    console.error(JSON.stringify({ event: 'discord-command-registration-error', message: error.message }));
  }
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
    if (command === 'vpn-status' || command === 'deployment-status') {
      await interaction.reply({ content: await statusMessage(), ephemeral: true });
      return;
    }

    const record = createControlRecord({
      command,
      discordUserId: interaction.user.id,
      guildId: interaction.guildId,
      channelId: interaction.channelId,
      options: optionsFromInteraction(interaction)
    }, infrastructureLive);

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

client.on(Events.Error, async error => {
  await writeRuntimeState({ status: 'degraded', lastError: 'discord-client-error' }).catch(() => {});
  console.error(JSON.stringify({ event: 'discord-client-error', message: error.message }));
});

async function shutdown(signal) {
  await writeRuntimeState({ status: 'offline', gatewayConnected: false, shutdownSignal: signal }).catch(() => {});
  client.destroy();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

await client.login(token);
