const applicationId = process.env.DISCORD_APPLICATION_ID?.trim();
if (!/^\d{17,20}$/.test(applicationId ?? '')) {
  throw new Error('DISCORD_APPLICATION_ID must be a Discord snowflake');
}

const params = new URLSearchParams({
  client_id: applicationId,
  scope: 'bot applications.commands',
  permissions: '0'
});

const url = `https://discord.com/oauth2/authorize?${params.toString()}`;
console.log(url);
