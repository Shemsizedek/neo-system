/** Authorized read-only inbox handler. No upstream runtime => fail closed. */
export function createInboxHandler({router,verifyIdentity,mailbox,enabled=false}={}) {
 return async function handle(req,res){
  const send=(status,body)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store, private','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));};
  if(!enabled||!router||typeof verifyIdentity!=='function'||!mailbox)return send(503,{error:'inbox_not_certified'});
  if(req.method!=='GET')return send(405,{error:'method_not_allowed'});
  const authorization=req.headers.authorization || '';
  const match=/^Bearer ([A-Za-z0-9._-]{20,8192})$/.exec(authorization);
  if(!match)return send(401,{error:'bearer_required'});
  try{
   // Real authorization is independently verified server-side by the router.
   const claims=await verifyIdentity({token:match[1]});
   if(!claims?.verified||!claims.subject||claims.mailbox!==mailbox)return send(403,{error:'access_denied'});
   const grant={provider:'titan',capability:'inbound-read',verified:true,subject:claims.subject,mailbox};
   const result=await router.readInbox({provider:'titan',grant,identity:{token:match[1]},limit:10});
   if(!result.ok)return send(403,{error:'access_denied'});
   return send(200,{messages:result.messages});
  }catch{return send(503,{error:'upstream_unavailable'});}
 };
}
