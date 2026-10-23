import {getNeoMask} from './index.js'
export async function getNeoMaskPermissions(){return getNeoMask().request({method:'neo_getPermissions'})}
export async function revokeNeoMaskPermissions(permissions){return getNeoMask().request({method:'neo_revokePermissions',params:[{permissions}]})}
export async function requestNeoMaskMessageSignature(message){return getNeoMask().request({method:'neo_signMessage',params:[{message}]})}
