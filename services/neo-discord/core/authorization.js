function csv(value){return String(value||'').split(',').map(x=>x.trim()).filter(Boolean)}

export function discordActor(interaction){
  const user=interaction?.member?.user||interaction?.user||{}
  const roles=Array.isArray(interaction?.member?.roles)?interaction.member.roles.map(String):[]
  return {id:String(user.id||''),guildId:String(interaction?.guild_id||''),roles}
}

export function isDiscordActorAllowed(interaction,env={}){
  const users=csv(env.DISCORD_ALLOWED_USER_IDS)
  const guilds=csv(env.DISCORD_ALLOWED_GUILD_IDS)
  const actor=discordActor(interaction)
  if(users.length&&!users.includes(actor.id)) return false
  if(guilds.length&&actor.guildId&&!guilds.includes(actor.guildId)) return false
  return true
}

export function isDiscordOperator(interaction,env={}){
  const actor=discordActor(interaction)
  const users=csv(env.DISCORD_OPERATOR_USER_IDS)
  const roles=csv(env.DISCORD_OPERATOR_ROLE_IDS)
  if(!users.length&&!roles.length)return false
  if(users.includes(actor.id))return true
  return roles.some(role=>actor.roles.includes(role))
}
