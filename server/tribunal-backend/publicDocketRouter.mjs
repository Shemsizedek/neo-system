import {listPublicDocket,publicCaseDocket,publishDocketEvent,listWorkspaceDocket,withdrawDocketEvent} from './publicDocket.mjs'

export function handlePublicDocketRoute({req,res,url,json,match,db,service,principal,body}){
  if(req.method==='GET'&&url.pathname==='/v1/public/docket'){
    return json(res,200,{items:listPublicDocket(db,{claimNo:url.searchParams.get('claimNo')||'',kind:url.searchParams.get('kind')||'',from:url.searchParams.get('from')||'',to:url.searchParams.get('to')||'',limit:url.searchParams.get('limit')||200})})
  }
  let p=match(url.pathname,'/v1/public/docket/cases/:claimNo')
  if(p&&req.method==='GET')return json(res,200,publicCaseDocket(db,p.claimNo))
  if(!principal)return false
  p=match(url.pathname,'/v1/workspaces/:workspaceId/docket')
  if(p&&req.method==='GET')return json(res,200,{items:listWorkspaceDocket(db,service,principal,p.workspaceId,url.searchParams.get('status')||'')})
  if(p&&req.method==='POST')return body(req).then(input=>json(res,201,publishDocketEvent(db,service,principal,p.workspaceId,input)))
  p=match(url.pathname,'/v1/workspaces/:workspaceId/docket/:eventId/withdraw')
  if(p&&req.method==='POST')return json(res,200,withdrawDocketEvent(db,service,principal,p.workspaceId,p.eventId))
  return false
}
