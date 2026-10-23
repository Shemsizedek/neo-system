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
  if(method==='neo_requestPermissions')return permissions.grant(origin,params[0]||{})
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
