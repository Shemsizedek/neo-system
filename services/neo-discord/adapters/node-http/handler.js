import { verifyKey } from 'discord-interactions'
import { createNodeRuntimeAdapter } from './runtime.js'
import { createDiscordHttpHandler } from '../../core/interaction.js'

export function createNodeHttpHandler({askRuntimeAI=null,label='Node HTTP',verify=verifyKey}={}){
  return createDiscordHttpHandler({
    transportAdapter:'node-http',
    runtimeFactory:()=>createNodeRuntimeAdapter({askRuntimeAI,label}),
    verifySignature:async({request,env,raw})=>{
      const sig=request.headers.get('x-signature-ed25519')||''
      const ts=request.headers.get('x-signature-timestamp')||''
      const key=String(env.DISCORD_PUBLIC_KEY||'').trim()
      if(!sig||!ts||!key)return false
      return verify(raw,sig,ts,key)
    }
  })
}
