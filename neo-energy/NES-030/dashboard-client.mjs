// NES-030 browser-side read-only preview adapter. Never handles token minting.
export async function loadSyntheticOverview({endpoint,token,fetchImpl=fetch}={}){
 if(typeof endpoint!=='string'||!endpoint.startsWith('/')||endpoint.startsWith('//'))
   throw new Error('same_origin_endpoint_required');
 if(typeof token!=='string'||!token)
   throw new Error('authentication_required');
 const response=await fetchImpl(endpoint,{
   method:'GET',headers:{Authorization:'Bearer '+token,Accept:'application/json'},
   cache:'no-store',credentials:'omit',redirect:'error'
 });
 if(!response.ok)throw new Error(response.status===401||response.status===403?
    'not_authorized':'staging_unavailable');
 const payload=await response.json();
 if(payload.mode!=='SIMULATION_ONLY'||payload.payment_due!==false||
    payload.field_control_authorized!==false)
   throw new Error('unsafe_or_unexpected_payload');
 return Object.freeze({tenant:String(payload.tenant),site:String(payload.site),
   import_kwh:String(payload.import_kwh),export_kwh:String(payload.export_kwh),
   label:'SIMULATED — NOT A BILL'});
}
