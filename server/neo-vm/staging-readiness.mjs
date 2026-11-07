import { isAbsolute,resolve,sep } from 'node:path'
import { VmInputError } from '../../core/neo-bvm/input.mjs'

// Operator evidence assessment only. This report never enables a signer.
export function inspectVmStagingReadiness({service,deploy,health,runtime,expectedWorkspace,expectedCommit}={}) {
  const details=service?.serviceDetails??{},volume=details.disk??service?.disk
  const storage=runtime?.approvalStorage, mount=volume?.mountPath
  const databasePath=storage?.databasePath
  const inVolume=typeof mount==='string' && isAbsolute(mount) && typeof databasePath==='string' && isAbsolute(databasePath) && resolve(databasePath).startsWith(resolve(mount)+sep)
  const checks={
    workspaceVerified:typeof expectedWorkspace==='string' && !!expectedWorkspace && service?.ownerId===expectedWorkspace,
    liveDeploy:deploy?.status==='live',
    intendedCommit:typeof expectedCommit==='string' && /^[0-9a-f]{40}$/.test(expectedCommit) && deploy?.commit?.id===expectedCommit && runtime?.sourceCommit===expectedCommit,
    gatewayResponding:health?.status===200 && health?.body?.status==='running',
    regtestRuntime:runtime?.schemaVersion===1 && runtime?.service==='neo-vm-signer' && runtime?.network==='regtest',
    singleInstance:details.numInstances===1,
    persistentSqlite:!!inVolume && storage?.backend==='sqlite' && storage.journalMode==='wal' && storage.synchronous==='FULL',
    liveIdentityVerified:runtime?.identityReady===true,
    pairedDeviceVerified:runtime?.pairingProofVerified===true && runtime?.fixtureKeys===false && runtime?.signerProbeVerified===true,
    outcomeAuditReady:runtime?.outcomeAuditReady===true,
  }
  return Object.freeze({status:Object.values(checks).every(Boolean)?'READY_FOR_REGTEST_REVIEW':'BLOCKED',checks:Object.freeze(checks),
    blockers:Object.freeze(Object.entries(checks).filter(([,value])=>!value).map(([key])=>key)),
    authorizationGranted:false,productionSigningEnabled:false})
}

export async function probeVmStagingHealth({baseUrl,fetchImpl=globalThis.fetch,timeoutMs=20_000}={}) {
  let base
  try{base=new URL(baseUrl)}catch{throw new VmInputError('VM_STAGING_URL_INVALID')}
  if(base.protocol!=='https:' || base.username || base.password || base.pathname!=='/' || base.search || base.hash ||
    typeof fetchImpl!=='function' || !Number.isSafeInteger(timeoutMs) || timeoutMs<1 || timeoutMs>30_000)throw new VmInputError('VM_STAGING_URL_INVALID')
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs)
  try{
    const response=await fetchImpl(new URL('/healthz',base),{method:'GET',redirect:'error',credentials:'omit',cache:'no-store',signal:controller.signal,headers:{Accept:'application/json'}})
    if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type')||'') || !response.body?.getReader)return {status:response.status,body:null}
    const reader=response.body.getReader(),chunks=[];let size=0
    try{while(true){const p=await reader.read();if(p.done)break;size+=p.value.byteLength;if(size>16_384){await reader.cancel();throw new VmInputError('VM_STAGING_RESPONSE_TOO_LARGE')}chunks.push(Buffer.from(p.value))}}
    finally{reader.releaseLock()}
    try{return {status:response.status,body:JSON.parse(Buffer.concat(chunks,size).toString('utf8'))}}
    catch{return {status:response.status,body:null}}
  }catch(error){return {status:null,body:null,error:error instanceof VmInputError?error.code:'VM_STAGING_HEALTH_UNVERIFIED'}}
  finally{clearTimeout(timer)}
}
