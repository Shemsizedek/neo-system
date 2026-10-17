// NES-025: request adapter for read-only synthetic NEO Energy preview.
// No HTTP listener, external IdP, or database connection is created here.
import {createEnergyPreview} from '../NES-024/energy-preview.mjs';

export function createPreviewRoute(dependencies) {
  const preview=createEnergyPreview(dependencies);
  return async function handle({method,authorization,tenantId,siteId}) {
    if(method!=='GET') return {status:405,body:{error:'read_only'}};
    const match=typeof authorization==='string' ? /^Bearer ([A-Za-z0-9_.-]+)$/.exec(authorization) : null;
    if(!match) return {status:401,body:{error:'unauthenticated'}};
    try {
      const body=await preview({token:match[1],tenantId,siteId});
      return {status:200,headers:{'Cache-Control':'no-store'},body};
    } catch {
      // Deliberately conceal whether a site exists or belongs to another tenant.
      return {status:403,body:{error:'access_denied'}};
    }
  };
}
