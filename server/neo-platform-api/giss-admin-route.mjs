import { createSuperintendentDashboardView } from './giss-superintendent-dashboard.mjs';
import { renderGisdAdminDashboard } from './giss-admin-dashboard-html.mjs';

// CSC-GISS-009: explicitly injected institutional data and memberships.
// No default global admin. Do not derive memberships from academic tokens.
export function createGisdAdminRoute({ subjectResolver, loadInstitutionContext } = {}) {
  if (typeof subjectResolver !== 'function' || typeof loadInstitutionContext !== 'function') throw new Error('gisd_admin_dependencies_required');
  return async function handleGisdAdminRoute(req,res,url) {
    if (url.pathname !== '/portal/school/admin') return false;
    const headers={'cache-control':'no-store','content-type':'text/html; charset=utf-8','x-content-type-options':'nosniff'};
    const send=(status,body)=>{res.writeHead(status,headers);res.end(body);};
    if (req.method !== 'GET') {send(405,'Method not allowed');return true;}
    const subject=subjectResolver(req);
    if (!subject) {send(401,'Authentication required');return true;}
    const institutionId=url.searchParams.get('institutionId');
    if (!institutionId || !/^[a-zA-Z0-9_-]{1,80}$/.test(institutionId)) {send(400,'Valid institutionId required');return true;}
    // Loader MUST verify signed-in identity and return trusted, persisted membership records.
    const context=await loadInstitutionContext({subject,institutionId});
    if (!context?.actor || context.actor.subjectId !== subject || !context.institution) {send(403,'Access denied');return true;}
    const view=createSuperintendentDashboardView({actor:context.actor,institutionId,institution:context.institution,reporting:context.reporting});
    if (!view.allowed) {send(403,'Access denied');return true;}
    send(200,'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>NEO Cipher Admin Dashboard</title><main>'+renderGisdAdminDashboard(view)+'</main></html>');
    return true;
  };
}
