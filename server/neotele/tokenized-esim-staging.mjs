import {createHash} from 'node:crypto';
import {createGuardianProofGate} from './guardian-proof.mjs';
import {createNeoTeleCrownEvidenceAdapter} from './crown-evidence-adapter.mjs';

// NTEL-014: staging-only service entitlement; NEVER an eUICC profile or carrier credential.
const digest=x=>'sha256:'+createHash('sha256').update(x).digest('hex');
export function createNeoTeleTokenizedEsimStaging({vault,loadDocumentBytes,verifyWebAuthn,consumeChallenge,loadEvidence,resolveSession,loadMembership}={}){
 for(const [name,fn] of Object.entries({loadDocumentBytes,verifyWebAuthn,consumeChallenge,loadEvidence,resolveSession,loadMembership})) if(typeof fn!=='function')throw Error('adapter_required:'+name);
 if(typeof vault?.getEvidence!=='function')throw Error('evidence_vault_required');
 const guardian=createGuardianProofGate({verifyWebAuthn,consumeChallenge,loadEvidence});
 const verifyVault=createNeoTeleCrownEvidenceAdapter({getVaultEvidence:id=>vault.getEvidence(id),loadDocumentBytes});
 return Object.freeze({
  async certify({sessionToken,reference,decision='APPROVED',assertion,vaultEvidenceId,expectedDigest}={}){
   const identity=await resolveSession(sessionToken);
   if(!identity?.verified||!identity.subject)throw Error('neopass_authentication_required');
   const membership=await loadMembership(identity.subject);
   if(!membership?.verified||membership.subject!==identity.subject||membership.status!=='ACTIVE'||membership.cohort!=='chaplaincy')throw Error('chaplaincy_membership_required');
   const proof=await guardian({subject:identity.subject,reference,decision,assertion});
   const evidence=await verifyVault({vaultEvidenceId,expectedDigest});
   return Object.freeze({identity:identity.subject,guardianChallengeConsumed:!!proof.id,evidenceReference:evidence.reference,
    documentIntegrityVerified:evidence.contentDigestVerified,readyForManualReview:true,productionEnabled:false});
  },
  createEntitlementDraft({memberPseudonym,planId='chaplaincy-sponsored-connectivity',deviceBindingHash}={}){
   if(typeof memberPseudonym!=='string'||!/^sha256:[0-9a-f]{64}$/.test(memberPseudonym)||
     !/^sha256:[0-9a-f]{64}$/.test(deviceBindingHash||''))throw Error('pseudonymous_binding_required');
   // No EID, ICCID, IMSI, phone number, QR/activation code or private key on-chain.
   const payload={protocol:'NEOTELE-ENTITLEMENT-1',network:'Bitcoin/Counterparty',provider:'Noogle Telecommunications',
     planId,memberPseudonym,deviceBindingHash,status:'DRAFT',transferable:false,carrierProfileIssued:false};
   return Object.freeze({...payload,commitment:digest(JSON.stringify(payload)),txid:null,networkPublished:false,activationEnabled:false});
  },
  async activate(){throw Error('ESIM_PROVISIONING_DISABLED_PENDING_CARRIER_CERTIFICATION');}
 });
}
