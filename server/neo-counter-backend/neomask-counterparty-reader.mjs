// Server-side Counterparty API v2 transport; chain synchronization and issuer provenance
// MUST be established by a separately configured, trusted reconciler.
export function createCounterpartyReader({baseUrl,fetchImpl=fetch,allowHosts=[]}){
 const u=new URL(baseUrl);if(u.protocol!=='https:'||u.username||u.password||!allowHosts.includes(u.hostname))throw Error('counterparty_endpoint_not_allowed');
 const base=u.toString().replace(/\/$/,'');
 return Object.freeze({
  async balances(address){
   if(typeof address!=='string'||!/^(bc1|tb1|bcrt1|1|3|m|n|2)[A-Za-z0-9]{14,90}$/.test(address))throw Error('invalid_bitcoin_address');
   const res=await fetchImpl(base+'/addresses/'+encodeURIComponent(address)+'/balances',{method:'GET',headers:{accept:'application/json'},signal:AbortSignal.timeout(8000),redirect:'error'});
   if(!res.ok)throw Error('counterparty_api_error');
   const body=await res.json();if(!Array.isArray(body?.result))throw Error('invalid_counterparty_response');
   if(body.result.length>1000)throw Error('too_many_assets');
   return Object.freeze({address,balances:body.result,verified:false,reason:'chain_tip_and_issuer_reconciliation_required'});
  }
 });
}
