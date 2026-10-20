// NMASK-034: read-only provider discovery; never call private-key/signing operations.
export const NEO_MASK_PROTOCOL='neomask.bitcoin.v1';
const NETWORKS=new Set(['bitcoin','signet','regtest']);
const PERMISSIONS=new Set(['read_accounts','read_balances','request_receive']);
export function inspectNeoMaskProvider(provider){
  if(!provider||typeof provider!=='object')return Object.freeze({detected:false,compatible:false,reason:'provider_missing'});
  if(provider.protocol!==NEO_MASK_PROTOCOL)return Object.freeze({detected:true,compatible:false,reason:'protocol_mismatch'});
  if(typeof provider.request!=='function')return Object.freeze({detected:true,compatible:false,reason:'request_api_missing'});
  return Object.freeze({detected:true,compatible:true,reason:'read_only_provider_detected'});
}
export function createNeoMaskReadSession({provider,origin,network,permissions,identity}){
  const inspected=inspectNeoMaskProvider(provider);
  if(!inspected.compatible)throw new Error(inspected.reason);
  if(typeof origin!=='string'||!origin.startsWith('https://')||origin.includes('@'))throw new Error('invalid_origin');
  if(!NETWORKS.has(network))throw new Error('unsupported_network');
  if(!Array.isArray(permissions)||permissions.length===0||permissions.some(p=>!PERMISSIONS.has(p)))throw new Error('unsupported_permission');
  if(!identity||typeof identity.subject!=='string'||!identity.subject.trim()||identity.verified!==true)throw new Error('trusted_identity_required');
  const request=Object.freeze({protocol:NEO_MASK_PROTOCOL,origin,network,permissions:[...new Set(permissions)],subject:identity.subject});
  return Object.freeze({request,provider,canSign:false,canBroadcast:false,canSettle:false});
}
export async function requestNeoMaskAccounts(session){
  if(!session?.request?.permissions.includes('read_accounts'))throw new Error('permission_required');
  const result=await session.provider.request({method:'neomask_getAccounts',params:session.request});
  if(!result||result.network!==session.request.network||!Array.isArray(result.accounts))throw new Error('invalid_provider_response');
  return result.accounts.filter(a=>typeof a.address==='string'&&a.address.length>=14).map(a=>Object.freeze({address:a.address,network:result.network}));
}
