import {createServer} from 'node:http'
import {openTribunalDb} from './db.mjs'
import {TribunalService} from './service.mjs'
import {changePassword,consumePasswordReset,issuePasswordReset,listDeliveries,operationalReport,recordDelivery} from './adminOps.mjs'
import {communicationsReport,createTemplate,hearingIcs,listOutbox,listProviderConfigs,listTemplates,processCommunication,queueCommunication,retryDeadLetter,saveProviderConfig} from './communications.mjs'

const db=openTribunalDb();const service=new TribunalService(db);const port=Number(process.env.PORT||8787)
const hits=new Map()
function json(res,status,body,headers={}){res.writeHead(status,{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,PUT,PATCH,OPTIONS',...headers});res.end(typeof body==='string'?body:JSON.stringify(body))}
async function body(req){const chunks=[];for await(const chunk of req)chunks.push(chunk);if(!chunks.length)return {};return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
function token(req){return String(req.headers.authorization||'').replace(/^Bearer\s+/i,'')}
function match(path,pattern){const a=path.split('/').filter(Boolean),b=pattern.split('/').filter(Boolean);if(a.length!==b.length)return null;const params={};for(let i=0;i<b.length;i++){if(b[i].startsWith(':'))params[b[i].slice(1)]=decodeURIComponent(a[i]);else if(a[i]!==b[i])return null}return params}
function rateLimit(req){const key=req.socket.remoteAddress||'unknown',minute=Math.floor(Date.now()/60000),id=`${key}:${minute}`,count=(hits.get(id)||0)+1;hits.set(id,count);return count<=240}

const server=createServer(async(req,res)=>{
  if(req.method==='OPTIONS')return json(res,204,{})
  if(!rateLimit(req))return json(res,429,{error:'Rate limit exceeded.'})
  const url=new URL(req.url,'http://localhost')
  try{
    if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-tribunal-backend',version:'1.2',schema:3,time:new Date().toISOString()})
    if(req.method==='POST'&&url.pathname==='/v1/auth/register')return json(res,201,service.register(await body(req)))
    if(req.method==='POST'&&url.pathname==='/v1/auth/login')return json(res,200,service.login(await body(req)))
    if(req.method==='POST'&&url.pathname==='/v1/auth/reset/consume')return json(res,200,consumePasswordReset(db,await body(req)))
    if(req.method==='POST'&&url.pathname==='/v1/auth/logout'){service.logout(token(req));return json(res,200,{ok:true})}
    const principal=service.principal(token(req))
    if(req.method==='POST'&&url.pathname==='/v1/auth/password')return json(res,200,changePassword(db,principal,await body(req)))
    if(req.method==='GET'&&url.pathname==='/v1/workspaces')return json(res,200,{items:service.listWorkspaces(principal)})
    if(req.method==='POST'&&url.pathname==='/v1/workspaces')return json(res,201,service.createWorkspace(principal,await body(req)))
    if(req.method==='POST'&&url.pathname==='/v1/invitations/accept')return json(res,200,service.acceptInvite(principal,(await body(req)).token))

    let p=match(url.pathname,'/v1/workspaces/:workspaceId/invitations');if(p&&req.method==='POST')return json(res,201,service.invite(principal,p.workspaceId,await body(req)))
    p=match(url.pathname,'/v1/workspaces/:workspaceId/members');if(p&&req.method==='GET')return json(res,200,{items:service.listMembers(principal,p.workspaceId)})
    p=match(url.pathname,'/v1/workspaces/:workspaceId/members/:userId');if(p&&req.method==='PATCH')return json(res,200,service.setMemberRole(principal,p.workspaceId,p.userId,(await body(req)).role))
    p=match(url.pathname,'/v1/workspaces/:workspaceId/password-resets');if(p&&req.method==='POST')return json(res,201,issuePasswordReset(db,service,principal,p.workspaceId,await body(req)))
    p=match(url.pathname,'/v1/workspaces/:workspaceId/cases');if(p&&req.method==='GET')return json(res,200,{items:service.listCases(principal,p.workspaceId,url.searchParams.get('q')||'')})
    p=match(url.pathname,'/v1/workspaces/:workspaceId/cases/:claimNo');if(p&&req.method==='GET')return json(res,200,service.getCase(principal,p.workspaceId,p.claimNo));if(p&&req.method==='PUT'){const input=await body(req);return json(res,200,service.saveCase(principal,p.workspaceId,{...input.caseFile,claimNo:p.claimNo},input.expectedRevision))}
    p=match(url.pathname,'/v1/workspaces/:workspaceId/efiles');if(p&&req.method==='POST')return json(res,201,service.fileEFile(principal,p.workspaceId,await body(req)));if(p&&req.method==='GET')return json(res,200,{items:service.listEFiles(principal,p.workspaceId,url.searchParams.get('claimNo')||'')})
    p=match(url.pathname,'/v1/workspaces/:workspaceId/notices');if(p&&req.method==='POST')return json(res,201,service.saveNotice(principal,p.workspaceId,await body(req)));if(p&&req.method==='GET')return json(res,200,{items:service.listNotices(principal,p.workspaceId,url.searchParams.get('claimNo')||'')})
    p=match(url.pathname,'/v1/workspaces/:workspaceId/hearings');if(p&&req.method==='POST')return json(res,201,service.saveHearing(principal,p.workspaceId,await body(req)));if(p&&req.method==='GET')return json(res,200,{items:service.listHearings(principal,p.workspaceId,url.searchParams.get('claimNo')||'')})
    p=match(url.pathname,'/v1/workspaces/:workspaceId/deliveries');if(p&&req.method==='POST')return json(res,201,recordDelivery(db,service,principal,p.workspaceId,await body(req)));if(p&&req.method==='GET')return json(res,200,{items:listDeliveries(db,service,principal,p.workspaceId,url.searchParams.get('noticeId')||'')})
    p=match(url.pathname,'/v1/workspaces/:workspaceId/reports/operations');if(p&&req.method==='GET')return json(res,200,operationalReport(db,service,principal,p.workspaceId))

    p=match(url.pathname,'/v1/workspaces/:workspaceId/communications/templates');if(p&&req.method==='POST')return json(res,201,createTemplate(db,service,principal,p.workspaceId,await body(req)));if(p&&req.method==='GET')return json(res,200,{items:listTemplates(db,service,principal,p.workspaceId)})
    p=match(url.pathname,'/v1/workspaces/:workspaceId/communications/providers');if(p&&req.method==='POST')return json(res,201,saveProviderConfig(db,service,principal,p.workspaceId,await body(req)));if(p&&req.method==='GET')return json(res,200,{items:listProviderConfigs(db,service,principal,p.workspaceId)})
    p=match(url.pathname,'/v1/workspaces/:workspaceId/communications/outbox');if(p&&req.method==='POST')return json(res,201,queueCommunication(db,service,principal,p.workspaceId,await body(req)));if(p&&req.method==='GET')return json(res,200,{items:listOutbox(db,service,principal,p.workspaceId,url.searchParams.get('status')||'')})
    p=match(url.pathname,'/v1/workspaces/:workspaceId/communications/outbox/:id/process');if(p&&req.method==='POST')return json(res,200,processCommunication(db,service,principal,p.workspaceId,p.id,await body(req)))
    p=match(url.pathname,'/v1/workspaces/:workspaceId/communications/outbox/:id/retry');if(p&&req.method==='POST')return json(res,200,retryDeadLetter(db,service,principal,p.workspaceId,p.id))
    p=match(url.pathname,'/v1/workspaces/:workspaceId/communications/report');if(p&&req.method==='GET')return json(res,200,communicationsReport(db,service,principal,p.workspaceId))
    p=match(url.pathname,'/v1/workspaces/:workspaceId/hearings/:hearingId/calendar.ics');if(p&&req.method==='GET'){const item=hearingIcs(db,service,principal,p.workspaceId,p.hearingId);return json(res,200,item.content,{'content-type':'text/calendar; charset=utf-8','x-neo-payload-sha256':item.payloadHash,'x-neo-export-id':item.exportId})}

    p=match(url.pathname,'/v1/workspaces/:workspaceId/audit/export');if(p&&req.method==='GET')return json(res,200,service.exportAudit(principal,p.workspaceId,url.searchParams.get('afterSeq')||0))
    p=match(url.pathname,'/v1/workspaces/:workspaceId/audit/verify');if(p&&req.method==='GET'){service.authorize(principal,p.workspaceId,'REVIEWER');return json(res,200,service.verifyAudit(p.workspaceId))}
    return json(res,404,{error:'Not found'})
  }catch(error){const message=error instanceof Error?error.message:String(error);const status=/Authentication|required|credentials/i.test(message)?401:/membership|role|invitation email/i.test(message)?403:/conflict/i.test(message)?409:400;return json(res,status,{error:message})}
})
server.listen(port,()=>console.log(JSON.stringify({level:'info',event:'server_started',service:'neo-tribunal-backend',version:'1.2',schema:3,port})))
