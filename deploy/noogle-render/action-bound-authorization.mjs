import { createHash } from 'node:crypto';

// Inactive authorization contract. A real server-side WebAuthn verifier must
// attest the signed challenge and user verification; never trust posted flags.
const hash=o=>createHash('sha256').update(JSON.stringify(o)).digest('hex');
export function createActionBoundAuthorization({issueChallenge,verifyAssertion,consumeChallenge}) {
 if([issueChallenge,verifyAssertion,consumeChallenge].some(f=>typeof f!=='function'))
  throw Error('trusted_action_authorization_required');
 const actions=new Set(['devices.list','devices.rename','devices.revoke']);
 const canonical=(action,target,payload)=>{
  if(!actions.has(action))throw Error('action_not_allowed');
  if(action==='devices.list' && (target!==null || payload!==null))throw Error('invalid_action_scope');
  if(action!=='devices.list' && (typeof target!=='string'||!target))throw Error('target_required');
  if(action==='devices.rename' && (typeof payload?.label!=='string'||!payload.label.trim()||payload.label.length>80))throw Error('invalid_action_payload');
  if(action==='devices.revoke' && payload!==null)throw Error('invalid_action_payload');
  return hash({action,target,payload:action==='devices.rename'?{label:payload.label.trim()}:null});
 };
 return Object.freeze({
  async begin({subject,credentialId,action,target=null,payload=null}) {
   if(typeof subject!=='string'||!subject||typeof credentialId!=='string'||!credentialId)throw Error('identity_required');
   const actionHash=canonical(action,target,payload);
   return issueChallenge({subject,credentialId,actionHash,purpose:'device-management'});
  },
  async authorize({subject,credentialId,action,target=null,payload=null,assertion}) {
   if(typeof subject!=='string'||!subject||typeof credentialId!=='string'||!credentialId)throw Error('identity_required');
   const actionHash=canonical(action,target,payload);
   const proof=await verifyAssertion({subject,credentialId,actionHash,assertion});
   if(!proof || proof.subject!==subject || proof.credentialId!==credentialId || proof.userVerified!==true)return false;
   return Boolean(await consumeChallenge({subject,credentialId,actionHash,challenge:proof.challenge,purpose:'device-management'}));
  }
 });
}
