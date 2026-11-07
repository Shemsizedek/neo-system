import { createExternalSigningWorkflow } from './external-signer.mjs'
import { createExternalSignerClient } from './signer-transport.mjs'
import { isSignerPairingAuthority } from './signer-pairing.mjs'
import { isSqliteApprovalStore } from './approval-store.mjs'
import { signerRequestHash } from './signer-protocol.mjs'
import { finalTransactionBytes } from './final-transaction.mjs'
import { normalizePsbtIntent } from './psbt-authorization.mjs'
import { requireFields, VmInputError } from '../../core/neo-bvm/input.mjs'
import { sha256Hex } from '../../core/neo-bvm/runtime.mjs'

const fail = code => { throw new VmInputError(code) }

export function createPairedSigningWorkflow({pairingAuthority,approvalStore,adapterForPairing,transportAuthenticationToken,...configuration}={}) {
  if (!isSignerPairingAuthority(pairingAuthority) || !isSqliteApprovalStore(approvalStore)) fail('PAIRED_SIGNING_AUTHORITY_REQUIRED')
  if (adapterForPairing !== undefined && typeof adapterForPairing !== 'function') fail('SIGNER_ADAPTER_CONFIGURATION_REQUIRED')
  const adapterFactory=adapterForPairing ?? (pairing=>createExternalSignerClient({url:pairing.endpoint,authenticationToken:transportAuthenticationToken}))
  return Object.freeze({
    async signAndValidate(input) {
      requireFields(input,['token','pairingId','request'])
      requireFields(input.request,['program','intent','psbtBase64','approval'])
      requireFields(input.request.approval,['version','authorizerId','nonce','issuedAt','expiresAt','psbtHash','intentHash','signatureHex'])
      const token=input.token,requestedPairingId=input.pairingId,program=Object.freeze({...input.request.program})
      const captured=Object.freeze({program,intent:normalizePsbtIntent(input.request.intent,program),psbtBase64:input.request.psbtBase64,approval:Object.freeze({...input.request.approval})})
      const pairing=await pairingAuthority.getActive({token,pairingId:requestedPairingId}),pairingId=pairing.pairingId
      const requirePairing=async(request)=>{
        const current=await pairingAuthority.getActive({token,pairingId});if(current.fingerprint!==pairing.fingerprint)fail('PAIRING_CHANGED_DURING_SIGNING')
        const time=(configuration.now??(()=>Math.floor(Date.now()/1000)))()
        if (!Number.isSafeInteger(time) || time<request.issuedAt || time>=request.expiresAt) fail('SIGNER_AUTHORIZATION_EXPIRED')
      }
      const workflow=createExternalSigningWorkflow({...configuration,approvalStore,signer:pairing.signer,adapter:adapterFactory(pairing),lifecycle:{
        async prepared(request) {
          await requirePairing(request)
          approvalStore.prepareSigningAttempt({requestId:request.requestId,requestHash:signerRequestHash(request),pairingId,ownerHash:pairing.ownerHash,psbtHash:request.psbtHash,intentHash:request.intentHash})
        },
        async dispatching(request) { await requirePairing(request); approvalStore.advanceSigningAttempt(request.requestId,pairing.ownerHash,'DISPATCHED') },
        async responseVerified(request,response) {
          await requirePairing(request)
          approvalStore.advanceSigningAttempt(request.requestId,pairing.ownerHash,'RESPONSE_VERIFIED',{rawTransactionHash:sha256Hex(finalTransactionBytes(response.rawTransactionHex))})
        },
        async validated(request,result) {
          await requirePairing(request)
          approvalStore.advanceSigningAttempt(request.requestId,pairing.ownerHash,'VALIDATED',{txid:result.txid,wtxid:result.wtxid,rawTransactionHash:result.rawTransactionHash,
            feeSats:result.feeSats,blockHash:result.checkedAtBlockHash})
        },
        failed(request,error) {
          const attempt=approvalStore.getSigningAttempt(request.requestId,pairing.ownerHash)
          if (!attempt || ['CANCELLED','UNRESOLVED'].includes(attempt.status)) return
          const code=typeof error?.code==='string' && /^(SIGNER_|PSBT_|PAIRING_|PAIRED_|INVALID_|REGTEST_)[A-Z0-9_]{1,65}$/.test(error.code) ? error.code : 'SIGNING_OPERATION_FAILED'
          approvalStore.advanceSigningAttempt(request.requestId,pairing.ownerHash,attempt.status==='PREPARED'?'CANCELLED':'UNRESOLVED',{reasonCode:code})
        },
      }})
      const result=await workflow.signAndValidate({token,request:captured})
      return Object.freeze({...result,pairingId,auditRecorded:true})
    },
  })
}
