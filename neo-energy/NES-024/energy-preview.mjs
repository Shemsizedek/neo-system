// NES-024: composable authenticated energy preview, no live NEO Pass integration.
// This service requires an injected independently verified tenant-grant provider.
import { verifyEnergySession } from '../NES-023/verify-session.mjs';

export function createEnergyPreview({ secret, issuer, audience, grants, readingSummary, clock } = {}) {
  if (typeof grants !== 'function' || typeof readingSummary !== 'function' ||
      typeof secret !== 'string' || !issuer || !audience)
    throw new Error('preview_dependencies_not_configured');
  return async function preview({ token, tenantId, siteId }) {
    if (!tenantId || !siteId || typeof tenantId !== 'string' || typeof siteId !== 'string')
      throw new Error('invalid_site_scope');
    const claims=verifyEnergySession(token,{
      secret,issuer,audience,nowSeconds:clock ? clock() : Math.floor(Date.now()/1000)
    });
    // Ignore untrusted tenant/site claims in token. Never accept browser-supplied grants.
    const allowed=await grants({ subject:claims.subject, tenantId,siteId,
      permission:'energy.simulation.read' });
    if (allowed !== true) throw new Error('access_denied');
    const data=await readingSummary({ tenantId,siteId });
    return Object.freeze({siteId,tenantId,kind:'SYNTHETIC_PREVIEW',
      import_kwh:data.import_kwh,export_kwh:data.export_kwh,
      payment_due:false,field_control_authorized:false});
  };
}
