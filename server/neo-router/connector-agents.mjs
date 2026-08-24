function need(value,name){if(!value)throw new Error(`${name} is not configured`);return value}
function approvedWrite(action,ctx){if(action.mutating&&!ctx?.approved)throw new Error(`Approval required for mutating action: ${action.type}`)}
async function jsonFetch(url,{token,method='GET',body,headers={}}={}){
  const res=await fetch(url,{method,headers:{Accept:'application/json',...(token?{Authorization:`Bearer ${token}`}:{}) ,...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)})
  const text=await res.text();let data=null;try{data=text?JSON.parse(text):null}catch{data={raw:text}}
  if(!res.ok)throw new Error(`Connector request failed ${res.status}: ${data?.message??data?.error??text}`)
  return data
}
function repoParts(action,env){const full=action.repo??env.NEO_GITHUB_REPOSITORY??env.GITHUB_REPOSITORY;need(full,'NEO_GITHUB_REPOSITORY');const [owner,repo]=full.split('/');if(!owner||!repo)throw new Error('GitHub repository must be owner/name');return {owner,repo}}

export function createGitHubAgent({env=process.env}={}){
  const base=env.GITHUB_API_URL??'https://api.github.com'
  const token=env.NEO_GITHUB_TOKEN??env.GITHUB_TOKEN
  return async (action,ctx={})=>{
    const {owner,repo}=repoParts(action,env);const root=`${base}/repos/${owner}/${repo}`
    if(action.type==='github.get_repo')return jsonFetch(root,{token})
    if(action.type==='github.list_prs')return jsonFetch(`${root}/pulls?state=${encodeURIComponent(action.state??'open')}&per_page=${Math.min(100,action.limit??30)}`,{token})
    if(action.type==='github.create_issue'){approvedWrite(action,ctx);return jsonFetch(`${root}/issues`,{token,method:'POST',body:{title:need(action.title,'issue title'),body:action.body??''}})}
    if(action.type==='github.comment_issue'){approvedWrite(action,ctx);return jsonFetch(`${root}/issues/${Number(action.issueNumber)}/comments`,{token,method:'POST',body:{body:need(action.body,'comment body')}})}
    if(action.type==='github.merge_pr'){approvedWrite(action,ctx);return jsonFetch(`${root}/pulls/${Number(action.prNumber)}/merge`,{token,method:'PUT',body:{merge_method:action.mergeMethod??'squash'}})}
    throw new Error(`Unsupported GitHub action: ${action.type}`)
  }
}

export function createAsanaAgent({env=process.env}={}){
  const token=env.ASANA_ACCESS_TOKEN;const base=env.ASANA_API_URL??'https://app.asana.com/api/1.0'
  return async(action,ctx={})=>{
    need(token,'ASANA_ACCESS_TOKEN')
    if(action.type==='asana.get_task')return jsonFetch(`${base}/tasks/${encodeURIComponent(need(action.taskGid,'taskGid'))}`,{token})
    if(action.type==='asana.create_task'){approvedWrite(action,ctx);return jsonFetch(`${base}/tasks`,{token,method:'POST',body:{data:{name:need(action.name,'task name'),notes:action.notes??'',projects:action.projectGid?[action.projectGid]:undefined,assignee:action.assignee??undefined}}})}
    if(action.type==='asana.update_task'){approvedWrite(action,ctx);return jsonFetch(`${base}/tasks/${encodeURIComponent(need(action.taskGid,'taskGid'))}`,{token,method:'PUT',body:{data:action.data??{}}})}
    throw new Error(`Unsupported Asana action: ${action.type}`)
  }
}
function b64url(text){return Buffer.from(text).toString('base64url')}
export function createGmailAgent({env=process.env}={}){
  const token=env.GMAIL_ACCESS_TOKEN;const base=env.GMAIL_API_URL??'https://gmail.googleapis.com/gmail/v1/users/me'
  return async(action,ctx={})=>{
    need(token,'GMAIL_ACCESS_TOKEN')
    if(action.type==='gmail.list')return jsonFetch(`${base}/messages?maxResults=${Math.min(100,action.limit??20)}${action.q?`&q=${encodeURIComponent(action.q)}`:''}`,{token})
    if(action.type==='gmail.create_draft'||action.type==='gmail.send'){
      approvedWrite(action,ctx)
      const raw=b64url(`To: ${need(action.to,'to')}\r\nSubject: ${need(action.subject,'subject')}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${action.body??''}`)
      const endpoint=action.type==='gmail.send'?'messages/send':'drafts'
      const body=action.type==='gmail.send'?{raw}:{message:{raw}}
      return jsonFetch(`${base}/${endpoint}`,{token,method:'POST',body})
    }
    throw new Error(`Unsupported Gmail action: ${action.type}`)
  }
}
export function createAirbyteAgent({env=process.env}={}){
  const base=env.AIRBYTE_AGENT_ENGINE_URL;const token=env.AIRBYTE_AGENT_ENGINE_TOKEN
  return async(action,ctx={})=>{
    need(base,'AIRBYTE_AGENT_ENGINE_URL');approvedWrite(action,ctx)
    return jsonFetch(`${base.replace(/\/$/,'')}/invoke`,{token,method:'POST',body:{connector:need(action.targetConnector,'targetConnector'),action:need(action.operation,'operation'),input:action.input??{},missionId:ctx.mission?.id??null,workerId:ctx.workerId??null}})
  }
}
export function createLiveConnectorAgents(options={}){
  return {'github-live':createGitHubAgent(options),'asana-live':createAsanaAgent(options),'gmail-live':createGmailAgent(options),'airbyte-live':createAirbyteAgent(options)}
}
