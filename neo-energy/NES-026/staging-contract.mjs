// NES-026 server-side interface for a future audited PostgreSQL adapter.
// It does not establish a PostgreSQL connection or HTTP listener.
import {verifyEnergySession} from '../NES-023/verify-session.mjs';

export function createStagingPreview({verifyOptions,lookupGrantAndRead}={}){
 if(!verifyOptions || typeof lookupGrantAndRead!=='function')
  throw new Error('staging_dependencies_required');
 return async function preview({token,tenant,site}={}){
  if(typeof tenant!=='string'||!tenant||typeof site!=='string'||!site)
   throw new Error('invalid_scope');
  const principal=verifyEnergySession(token,verifyOptions);
  // This adapter MUST execute authorization and read within one DB transaction
  // under server-managed, restricted authorization context, not caller GUCs.
  const row=await lookupGrantAndRead({subject:principal.subject,tenant,site,
                                     permission:'energy.simulation.read'});
  if(!row)throw new Error('access_denied');
  return {site,tenant,mode:'SIMULATION_ONLY',import_kwh:String(row.import_kwh),
    export_kwh:String(row.export_kwh),payment_due:false,field_control_enabled:false};
 };
}
