function ids(value){
  const raw=String(value||'').trim()
  if(!raw)return []
  const out=[]
  for(const part of raw.split(/[,;\s]+/)){
    let token=part.trim().replace(/^[\[\]"'`]+|[\[\]"'`]+$/g,'')
    if(token.includes('='))token=token.slice(token.lastIndexOf('=')+1).trim()
    token=token.replace(/^[\[\]"'`]+|[\[\]"'`]+$/g,'')
    if(token)out.push(token)
  }
  return [...new Set(out)]
}

export function discordActor(interaction){
  const user=interaction?.member?.user||interaction?.user||{}
  const roles=Array.isArray(interaction?.member?.roles)?interaction.member.roles.map(String):[]
  return {id:String(user.id||''),guildId:String(interaction?.guild_id||''),roles}
}

export function isDiscordActorAllowed(interaction,env={}){
  const users=ids(env.DISCORD_ALLOWED_USER_IDS)
  const guilds=ids(env.DISCORD_ALLOWED_GUILD_IDS)
  const actor=discordActor(interaction)
  if(users.length&&!users.includes(actor.id)) return false
  if(guilds.length&&actor.guildId&&!guilds.includes(actor.guildId)) return false
  return true
}

export function isDiscordOperator(interaction,env={}){
  const actor=discordActor(interaction)
  const users=ids(env.DISCORD_OPERATOR_USER_IDS)
  const roles=ids(env.DISCORD_OPERATOR_ROLE_IDS)
  if(!users.length&&!roles.length)return false
  if(users.includes(actor.id))return true
  return roles.some(role=>actor.roles.includes(role))
}
