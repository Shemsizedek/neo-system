import {verify,randomBytes} from 'node:crypto';

// Two independent Ed25519 public keys authorize a single first-key request.
// No private keys, credentials, HTTP route or real user data are stored here.
// The caller must authenticate approvers independently and never accept
// approver identity or approval actions from untrusted browser flags.
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{16,128}$/.test(v);
export function createNeoKeyBootstrapApprovalService({
  approverKeys,store,now=()=>Date.now()
}={}) {
  if(!(approverKeys instanceof Map)||approverKeys.size<2||
     [...approverKeys.entries()].some(([k,v])=>!id(k)||v?.asymmetricKeyType!=='ed25519')||
     new Set([...approverKeys.values()].map(key=>
       key.export({format:'der',type:'spki'}).toString('hex'))).size!==approverKeys.size||
     typeof store?.insertApproval!=='function'||typeof store?.findValidApproval!=='function') {
    throw Error('neo_key_bootstrap_approval_configuration_required');
  }
  const payload=(subject,rpId,origin,ref,expiresAt)=>
    Buffer.from(JSON.stringify({purpose:'neo-key-first-credential',subject,rpId,origin,
      authorizationRef:ref,expiresAt}));
  return Object.freeze({
    async acceptSignedApproval({subject,rpId,origin,authorizationRef,expiresAt,endorsements}={}) {
      if(typeof subject!=='string'||subject.length<3||subject.length>256||
         typeof rpId!=='string'||!(/^[a-z0-9.-]+$/).test(rpId)||
         origin!==`https://${rpId}`||!id(authorizationRef)||
         !Number.isSafeInteger(expiresAt)||expiresAt<=now()+1000||
         expiresAt>now()+300_000||
         !Array.isArray(endorsements)||endorsements.length!==2) {
        throw Error('neo_key_bootstrap_invalid_approval');
      }
      const message=payload(subject,rpId,origin,authorizationRef,expiresAt);
      const used=new Set();
      for(const e of endorsements){
        if(!id(e?.approverId)||used.has(e.approverId)||
           typeof e.signature!=='string'||
           !/^[A-Za-z0-9_-]{80,128}$/.test(e.signature)) {
          throw Error('neo_key_bootstrap_approvers_required');
        }
        const key=approverKeys.get(e.approverId);
        if(!key||!verify(null,message,key,Buffer.from(e.signature,'base64url'))) {
          throw Error('neo_key_bootstrap_invalid_signature');
        }
        used.add(e.approverId);
      }
      await store.insertApproval({subject,rpId,origin,authorizationRef,expiresAt,
        approverIds:[...used]});
      return Object.freeze({authorizationRef,expiresAt});
    },
    async verifyOperatorBootstrap({subject,rpId,origin,bootstrapEvidence}={}) {
      if(!id(bootstrapEvidence)||typeof subject!=='string'||typeof rpId!=='string'||
         origin!==`https://${rpId}`)return null;
      const record=await store.findValidApproval({
        subject,rpId,origin,authorizationRef:bootstrapEvidence,now:now()
      });
      if(!record||record.subject!==subject||record.rpId!==rpId||
         record.origin!==origin||record.authorizationRef!==bootstrapEvidence ||
         record.approverCount!==2)return null;
      return Object.freeze({verified:true,method:'dual-control',subject,
        authorizationRef:bootstrapEvidence});
    },
    // Independent signers use this exact canonical message. A server must
    // issue the reference and expiration; no shared secret is distributed.
    signingMessage:({subject,rpId,origin,authorizationRef,expiresAt})=>
      payload(subject,rpId,origin,authorizationRef,expiresAt)
  });
}
