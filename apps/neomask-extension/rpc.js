import {createPermissionStore,simulateTransaction,guardianDecision} from './security.js'

const permissions=createPermissionStore()
const SUPPORTED=new Set(['neo_requestAccounts','neo_getAccounts','neo_getAssets','neo_getBalances','neo_requestPermissions','neo_getPermissions','neo_revokePermissions','neo_simulateTransaction','neo_signPsbt','neo_signCounterpartyTransaction','neo_signMessage'])

async function signerRequest(method,payload){
  const bridge=globalThis.NeoMaskSignerBridge
  if(!bridge||typeof bridge.request!=='function')throw new Error('No device-local or hardware signer is connected')
  return bridge.request({method,payload})
}

export async function handleRpc({origin,method,params=[]}={}){
  if(!SUPPORTED.has(method))throw new Error('Unsupported NeoMask method')
  if(method==='neo_requestPermissions'){
    const requested=params[0]?.permissions;
    if(!Array.isArray(requested)||requested.length>4||requested.some(p=>!['accounts','read','transactions','sign'].includes(p)))throw new Error('Invalid permission request');
    const bridge=globalThis.NeoMaskPermissionBridge;
    if(typeof bridge?.request!=='function')throw new Error('Trusted permission approval UI is not connected');
    const allowed=[...new Set(requested)];
    const review=await bridge.request({origin,permissions:[...allowed],user_confirmation_required:true});
    if(review?.approved!==true||!Array.isArray(review.permissions)||review.permissions.some(p=>!allowed.includes(p))||!Array.isArray(review.accounts)||review.accounts.length>20||review.accounts.some(a=>typeof a!=='string'||a.length>128||!a.length))throw new Error('Permission approval required');
    return permissions.grant(origin,{permissions:review.permissions,accounts:review.accounts});
  }
  if(method==='neo_getPermissions')return permissions.get(origin)
  if(method==='neo_revokePermissions')return permissions.revoke(origin,params[0]||{})
  if(method==='neo_requestAccounts'||method==='neo_getAccounts'){
    permissions.require(origin,'accounts')
    return permissions.accounts(origin)
  }
  if(method==='neo_simulateTransaction'){
    permissions.require(origin,'transactions')
    return simulateTransaction(params[0]||{})
  }
  if(['neo_signPsbt','neo_signCounterpartyTransaction','neo_signMessage'].includes(method)){
    permissions.require(origin,'sign')
    const request=params[0]||{},simulation=simulateTransaction(request)
    const guardian=guardianDecision({origin,simulation,request})
    if(!guardian.allowed)throw new Error(`NEO Guardian blocked request: ${guardian.reason}`)
    return signerRequest(method,{origin,request,simulation,guardian,user_confirmation_required:true})
  }
  permissions.require(origin,'read')
  const bridge=globalThis.NeoMaskDataBridge
  if(!bridge||typeof bridge.request!=='function')throw new Error('NeoMask data bridge unavailable')
  return bridge.request({method,params,origin})
}
