// NCTR-CRM-012: tenant-scoped read API. No client-supplied role grants.
export function createCompanyCrmReadHandler({db,can}){
  if(!db||typeof can!=='function')throw new Error('crm_dependencies_required');
  return async function handle({principal,method,path,query={}}){
    const match=/^\/v1\/counter\/companies\/([^/]+)\/(customers|orders|memberships)$/.exec(path);
    if(!match||method!=='GET')return null;
    const companyId=decodeURIComponent(match[1]);
    const resource=match[2];
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(companyId))return {status:400,body:{error:'invalid_company_id'}};
    const permission=resource==='memberships'?'settings':'reports';
    if(!principal||!can(principal,permission,companyId))return {status:403,body:{error:'forbidden'}};
    const limit=Math.min(100,Math.max(1,Number.parseInt(query.limit||'25',10)||25));
    // Explicit company equality predicate prevents cross-tenant listing.
    const snapshot=await db.collection('neo_counter_crm_'+resource).where('companyId','==',companyId).orderBy('createdAt','desc').limit(limit).get();
    const items=snapshot.docs.map(doc=>({id:doc.id,...doc.data()})).filter(item=>item.companyId===companyId);
    return {status:200,body:{companyId,items,limit}};
  };
}
