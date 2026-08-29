import { SYSTEM_PROMPT } from '../../core/neo-command.js'

export function createNodeRuntimeAdapter({askRuntimeAI=null,label='Node HTTP'}={}){
  return {
    id:'node-http',
    version:'1.0',
    providerLabel:askRuntimeAI?label:'',
    async askRuntimeAI(prompt,systemPrompt=SYSTEM_PROMPT){
      if(typeof askRuntimeAI!=='function')throw new Error('Node runtime AI provider is not configured')
      const text=String(await askRuntimeAI(prompt,systemPrompt)||'').trim()
      if(!text)throw new Error('Node runtime AI provider returned no text')
      return text
    }
  }
}
