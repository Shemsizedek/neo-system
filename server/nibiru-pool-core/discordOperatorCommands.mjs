export const WORLD_MINT_DISCORD_COMMANDS=Object.freeze([
  {name:'pool-status',description:'Show World Mint Genesis Pool readiness and Bitcoin Core status'},
  {name:'pool-job',description:'Show the current World Mint mining job'},
  {name:'pool-help',description:'Show World Mint operator commands'}
])

export function createWorldMintDiscordHandler({statusProvider}={}){
  if(typeof statusProvider!=='function')throw new Error('STATUS_PROVIDER_REQUIRED')
  return async function handle(command){
    const name=String(command?.name||'')
    if(name==='pool-status'){
      const status=await statusProvider()
      return {ephemeral:true,content:[
        `Pool: ${status.poolId}`,
        `Running: ${status.running?'yes':'no'}`,
        `Ready: ${status.ready?'yes':'no'}`,
        `Bitcoin Core: ${status.bitcoinRpcHealthy?'healthy':'unavailable'}`,
        `Height: ${status.chain?.blocks??'n/a'}`,
        `Difficulty: ${status.difficulty??'n/a'}`,
        `Current job: ${status.job?.jobId??'none'}`
      ].join('\n')}
    }
    if(name==='pool-job'){
      const status=await statusProvider()
      if(!status.job)return {ephemeral:true,content:'No active World Mint mining job.'}
      return {ephemeral:true,content:[`Job: ${status.job.jobId}`,`Template: ${status.job.templateId}`,`Height: ${status.job.height}`,`Issued: ${status.job.issuedAt}`].join('\n')}
    }
    if(name==='pool-help')return {ephemeral:true,content:'World Mint commands: /pool-status, /pool-job. Worker credentials are created only through the secured operator CLI; secrets are never posted to Discord.'}
    return {ephemeral:true,content:'Unknown World Mint operator command.'}
  }
}
