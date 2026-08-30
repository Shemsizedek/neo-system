import fs from 'node:fs/promises';

const applicationId = process.env.DISCORD_APPLICATION_ID;
const botToken = process.env.DISCORD_BOT_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!applicationId) throw new Error('DISCORD_APPLICATION_ID is required');
if (!botToken) throw new Error('DISCORD_BOT_TOKEN is required');

const commands = JSON.parse(
  await fs.readFile(new URL('./application-commands.json', import.meta.url), 'utf8')
);

const route = guildId
  ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
  : `https://discord.com/api/v10/applications/${applicationId}/commands`;

const response = await fetch(route, {
  method: 'PUT',
  headers: {
    authorization: `Bot ${botToken}`,
    'content-type': 'application/json'
  },
  body: JSON.stringify(commands)
});

if (!response.ok) {
  const body = await response.text();
  throw new Error(`Discord command registration failed (${response.status}): ${body}`);
}

const registered = await response.json();
console.log(`Registered ${registered.length} NEO VPN Discord commands${guildId ? ` in guild ${guildId}` : ' globally'}.`);
