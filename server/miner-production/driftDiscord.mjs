const short=value=>String(value||'').slice(0,16)||'missing'

export function buildRuntimeDriftDiscordMessage({type,incident,attestation}={}){
  const drift=attestation?.drift||{}
  const identity=attestation?.identity||{}
  const opened=type==='OPENED'
  return {
    username:'NEO Emergency Operations',
    content:[
      opened?'🚨 **NEO MINER RUNTIME DRIFT HOLD OPENED**':'✅ **NEO MINER RUNTIME DRIFT HOLD RESOLVED**',
      `Incident: \`${incident?.id||'unknown'}\``,
      `Environment: \`${identity.environment||'unknown'}\``,
      `State: **${opened?'FINANCIAL MUTATIONS HELD':'RUNTIME IDENTITY VERIFIED'}**`,
      `Observed commit: \`${short(identity.buildCommitSha)}\``,
      `Authorized commit: \`${short(identity.authorizedCommitSha)}\``,
      `Observed image: \`${short(identity.runtimeImageDigest)}\``,
      `Authorized image: \`${short(identity.authorizedImageDigest)}\``,
      opened?`Reasons: ${drift.reasons?.join(', ')||'unknown'}`:'Resolution: runtime identity matches signed deployment authorization.'
    ].join('\n'),
    allowed_mentions:{parse:[]}
  }
}

export async function notifyRuntimeDriftDiscord(event,{webhookUrl=process.env.NEO_DISCORD_EMERGENCY_WEBHOOK_URL||process.env.DISCORD_WEBHOOK_URL,fetchImpl=fetch}={}){
  if(!webhookUrl)return {sent:false,reason:'DISCORD_WEBHOOK_NOT_CONFIGURED'}
  try{
    const response=await fetchImpl(webhookUrl,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(buildRuntimeDriftDiscordMessage(event))})
    if(!response.ok)return {sent:false,reason:`DISCORD_HTTP_${response.status}`}
    return {sent:true}
  }catch(error){
    return {sent:false,reason:'DISCORD_NOTIFICATION_FAILED',detail:String(error?.message||error)}
  }
}
