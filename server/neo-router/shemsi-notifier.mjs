function truncate(value,max=900){
  const text=String(value||'').trim();
  return text.length<=max?text:text.slice(0,max-1)+'…';
}

export function buildShemsiDiscordApprovalMessage({item,notice,consoleUrl=process.env.SHEMSI_CONSOLE_URL||'https://neo.holytemples.org/#/shemsi-comments'}={}){
  return {
    content:[
      '🟨 **Shemsi approval needed**',
      `Platform: **${item?.platform||'unknown'}**`,
      `Priority: **${notice?.priority||'normal'}**`,
      `Comment: ${truncate(item?.commentText,700)}`,
      `Review: ${consoleUrl}`,
    ].join('\n'),
    allowed_mentions:{parse:[]},
  };
}

export async function notifyShemsiApprovalDiscord(payload,{
  webhookUrl=process.env.SHEMSI_DISCORD_WEBHOOK_URL||process.env.DISCORD_WEBHOOK_URL,
  fetchImpl=fetch,
}={}){
  if(!webhookUrl)return {sent:false,reason:'DISCORD_WEBHOOK_NOT_CONFIGURED'};
  try{
    const response=await fetchImpl(webhookUrl,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify(buildShemsiDiscordApprovalMessage(payload)),
    });
    if(!response.ok)return {sent:false,reason:'DISCORD_WEBHOOK_FAILED',status:response.status};
    return {sent:true,status:response.status};
  }catch(error){
    return {sent:false,reason:'DISCORD_NOTIFICATION_FAILED',detail:String(error?.message||error)};
  }
}
