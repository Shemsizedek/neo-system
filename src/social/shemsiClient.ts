export type ShemsiTone='professional'|'warm'|'concise'|'educational'|'witty'|'measured'

export interface ShemsiGenerationInput{
  platform:string
  authorName?:string
  commentText:string
  parentContentText?:string
  tone:ShemsiTone
  maxLength?:number
}

function gatewayBase(){
  const configured=String(import.meta.env.VITE_NEO_AI_GATEWAY_URL||'').trim()
  return configured.replace(/\/$/,'')
}

function extractText(payload:any):string{
  const candidates=[
    payload?.result?.output_text,
    payload?.result?.text,
    payload?.result?.content,
    payload?.result,
    payload?.output_text,
    payload?.text,
  ]
  for(const value of candidates){
    if(typeof value==='string'&&value.trim()) return value.trim()
    if(Array.isArray(value)){
      const joined=value.map((part:any)=>typeof part==='string'?part:part?.text||part?.content||'').filter(Boolean).join('\n').trim()
      if(joined) return joined
    }
  }
  throw new Error('gateway_response_missing_text')
}

export async function generateShemsiReply(input:ShemsiGenerationInput,fetchImpl:typeof fetch=fetch){
  const context=[
    `Platform: ${input.platform}`,
    input.authorName?`Comment author: ${input.authorName}`:null,
    input.parentContentText?`Parent post/context:\n${input.parentContentText}`:null,
    `Incoming comment:\n${input.commentText}`,
    `Requested tone: ${input.tone}`,
    `Maximum response length: ${input.maxLength||600} characters`,
  ].filter(Boolean).join('\n\n')

  const objective=[
    'Draft one public-facing reply to the social-media comment below.',
    'Answer directly and respectfully. Do not invent facts or imply actions that have not occurred.',
    'Return only the reply text, with no analysis, labels, quotation marks, or publishing instructions.',
    context,
  ].join('\n\n')

  const response=await fetchImpl(`${gatewayBase()}/api/ai/execute`,{
    method:'POST',
    headers:{'content-type':'application/json'},
    credentials:'include',
    body:JSON.stringify({
      objective,
      capability:'writing',
      system:'NEO Social / Shemsi Comment Assistant',
      actions:[],
      approved:false,
      autoKnowledge:false,
      maxTokens:512,
    }),
  })

  const body=await response.json().catch(()=>({}))
  if(!response.ok) throw new Error(body?.error||`gateway_http_${response.status}`)
  return {text:extractText(body),raw:body}
}


function socialBase(){
  const configured=String(import.meta.env.VITE_NEO_SOCIAL_GATEWAY_URL||'').trim()
  return configured.replace(/\/$/,'')
}
async function socialJson(path:string,init?:RequestInit){
  const response=await fetch(`${socialBase()}${path}`,{credentials:'include',...init,headers:{'content-type':'application/json',...(init?.headers||{})}})
  const body=await response.json().catch(()=>({}))
  if(!response.ok) throw new Error(body?.error||`social_gateway_http_${response.status}`)
  return body
}
export async function stageShemsiInbox(input:{platform:string;accountId:string;commentId:string;parentContentId:string;authorName?:string;commentText:string;parentContentText?:string}){
  return socialJson('/api/shemsi/inbox',{method:'POST',body:JSON.stringify(input)})
}
export async function saveShemsiDraft(input:{inboxId:string;responseText:string;tone:ShemsiTone}){
  return socialJson('/api/shemsi/drafts',{method:'POST',body:JSON.stringify(input)})
}
export async function approveShemsiDraft(id:string){
  return socialJson(`/api/shemsi/drafts/${encodeURIComponent(id)}/approve`,{method:'POST',body:'{}'})
}
export async function publishShemsiDraft(id:string){
  return socialJson(`/api/shemsi/drafts/${encodeURIComponent(id)}/publish`,{method:'POST',body:'{}'})
}


export async function syncShemsiComments(input:{platform:'linkedin'|'youtube';activityUrn?:string;videoId?:string;channelId?:string;pageToken?:string}){
  return socialJson('/api/shemsi/sync',{method:'POST',body:JSON.stringify(input)})
}
export async function listShemsiInbox(){
  return socialJson('/api/shemsi/inbox')
}
export async function verifyShemsiDraft(id:string){
  return socialJson(`/api/shemsi/drafts/${encodeURIComponent(id)}/verify`,{method:'POST',body:'{}'})
}
