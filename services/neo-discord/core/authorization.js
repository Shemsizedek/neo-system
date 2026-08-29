export function discordActor(interaction){
  const user=interaction?.member?.user||interaction?.user||{}
  return {id:String(user.id||''),guildId:String(interaction?.guild_id||'')}
}

export function isDiscordActorAllowed(interaction,env={}){
  const users=String(env.DISCORD_ALLOWED_USER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)
  const guilds=String(env.DISCORD_ALLOWED_GUILD_IDS||'').split(',').map(x=>x.trim()).filter(Boolean)
  const actor=discordActor(interaction)
  if(users.length&&!users.includes(actor.id)) return false
  if(guilds.length&&actor.guildId&&!guilds.includes(actor.guildId)) return false
  return true
}
