import {createServer} from 'node:http'
import {openTribunalDb} from './db.mjs'
import {TribunalService} from './service.mjs'

const db=openTribunalDb();const service=new TribunalService(db);const port=Number(process.env.PORT||8787)

function json(res,status,body){res.writeHead(status,{'content-type':'application/json','access-control-allow-origin':'*','access-control-allow-headers':'authorization,content-type','access-control-allow-methods':'GET,POST,PUT,OPTIONS'});res.end(JSON.stringify(body))}
async function body(req){const chunks=[];for await(const chunk of req)chunks.push(chunk);if(!chunks.length)return {};return JSON.parse(Buffer.concat(chunks).toString('utf8'))}
function token(req){return String(req.headers.authorization||'').replace(/^Bearer\s+/i,'')}
function match(path,pattern){const a=path.split('/').filter(Boolean),b=pattern.split('/').filter(Boolean);if(a.length!==b.length)return null;const params={};for(let i=0;i<b.length;i++){if(b[i].startsWith(':'))params[b[i].slice(1)]=decodeURIComponent(a[i]);else if(a[i]!==b[i])return null}return params}

const server=createServer(async(req,res)=>{
  if(req.method==='OPTIONS')return json(res,204,{})
  const url=new URL(req.url,'http://localhost')
  try{
    if(req.method==='GET'&&url.pathname==='/health')return json(res,200,{ok:true,service:'neo-tribunal-backend',version:'0.8'})
    if(req.method==='POST'&&url.pathname==='/v1/auth/register')return json(res,201,service.register(await body(req)))
    if(req.method==='POST'&&url.pathname==='/v1/auth/login')return json(res,200,service.login(await body(req)))
    const principal=service.principal(token(req))
    if(req.method==='POST'&&url.pathname==='/v1/workspaces')return json(res,201,service.createWorkspace(principal,await body(req)))
    if(req.method==='POST'&&url.pathname==='/v1/invitations/accept')return json(res,200,service.acceptInvite(principal,(await body(req)).token))

    let p=match(url.pathname,'/v1/workspaces/:workspaceId/invitations');if(p&&req.method==='POST')return json(res,201,service.invite(principal,p.workspaceId,await body(req)))
    p=match(url.pathname,'/v1/workspaces/:workspaceId/cases');if(p&&req.method==='GET')return json(res,200,{items:service.listCases(principal,p.workspaceId)})
    p=match(url.pathname,'/v1/workspaces/:workspaceId/cases/:claimNo');if(p&&req.method==='GET')return json(res,200,service.getCase(principal,p.workspaceId,p.claimNo))
    if(p&&req.method==='PUT'){const input=await body(req);return json(res,200,service.saveCase(principal,p.workspaceId,{...input.caseFile,claimNo:p.claimNo},input.expectedRevision))}
    p=match(url.pathname,'/v1/workspaces/:workspaceId/audit/export');if(p&&req.method==='GET')return json(res,200,service.exportAudit(principal,p.workspaceId,url.searchParams.get('afterSeq')||0))
    p=match(url.pathname,'/v1/workspaces/:workspaceId/audit/verify');if(p&&req.method==='GET'){service.authorize(principal,p.workspaceId,'REVIEWER');return json(res,200,service.verifyAudit(p.workspaceId))}
    return json(res,404,{error:'Not found'})
  }catch(error){const message=error instanceof Error?error.message:String(error);const status=/Authentication|required|credentials/i.test(message)?401:/membership|role|invitation email/i.test(message)?403:/conflict/i.test(message)?409:400;return json(res,status,{error:message})}
})

server.listen(port,()=>console.log(`NEO Tribunal backend listening on ${port}`))
