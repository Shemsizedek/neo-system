import { createHmac, timingSafeEqual } from 'node:crypto'

function safeEqual(a,b){const aa=Buffer.from(String(a??'')),bb=Buffer.from(String(b??''));return aa.length===bb.length&&timingSafeEqual(aa,bb)}
export function verifyGitHubSignature(rawBody,signature,secret){
  if(!secret||!signature)return false
  const expected=`sha256=${createHmac('sha256',secret).update(rawBody).digest('hex')}`
  return safeEqual(expected,signature)
}
export function verifyBearer(header,token){
  if(!token||!header)return false
  const value=header.startsWith('Bearer ')?header.slice(7):header
  return safeEqual(value,token)
}
export function normalizeInboundEvent({source,headers={},body={},rawBody=''}){
  if(source==='github'){
    const ghEvent=headers['x-github-event']??headers['X-GitHub-Event']??'unknown'
    const action=body.action??body.workflow_run?.conclusion??'event'
    let type=`${ghEvent}.${action}`
    if(ghEvent==='workflow_run'&&body.workflow_run?.conclusion==='failure')type='workflow_run.failed'
    return {id:headers['x-github-delivery']??headers['X-GitHub-Delivery'],source:'github',type,payload:body}
  }
  if(source==='asana')return {id:headers['x-hook-signature']??body.id,source:'asana',type:body.type??'task.changed',payload:body}
  if(source==='gmail')return {id:body.messageId??body.historyId,source:'gmail',type:body.type??'message.important',payload:body}
  if(source==='airbyte')return {id:body.eventId??body.id,source:'airbyte',type:body.type??'connector.degraded',payload:body}
  return {id:body.id,source,type:body.type??'unknown',payload:body,rawBody}
}
