import {createHash,timingSafeEqual} from 'node:crypto';
import {planFinancialOperation} from './fabric.mjs';

// Trusted-server-only authorization for the existing non-executing interop planner.
// This adapter deliberately cannot issue wallet transactions, conversions, or ledger postings.
const REF=/^[A-Za-z0-9][A-Za-z0-9._:-]{2,99}$/;
const SCOPE_BY_OPERATION=Object.freeze({
  BTC_DONATION_REQUEST:'payments:receive',
  BTC_SALE_REQUEST:'payments:receive',
  CES_CREDIT_TRANSFER_INTENT:'ces:prepare',
  CONVERSION_QUOTE:'conversion:quote',
  FIAT_ONRAMP_INTENT:'fiat:request',
  FIAT_OFFRAMP_INTENT:'fiat:request',
  NIBIRU_RESERVE_STATUS:'reserve:read'
});
const own=(obj,k)=>Object.prototype.hasOwnProperty.call(obj,k);
function equal(a,b){
  if(typeof a!=='string'||typeof b!=='string')return false;
  const aa=createHash('sha256').update(a).digest(),bb=createHash('sha256').update(b).digest();
  return timingSafeEqual(aa,bb);
}
function trustedContext(x){
  if(!x||typeof x!=='object'||Array.isArray(x)||!Object.isFrozen(x))throw Error('trusted_context_required');
  const keys=['workspace','actorRef','accountRef','scopes','status','issuer'];
  if(Object.keys(x).some(k=>!keys.includes(k))||keys.some(k=>!own(x,k)))throw Error('invalid_trusted_context');
  if(!['TEAM','PERSONAL'].includes(x.workspace)||!REF.test(x.actorRef??'')||!REF.test(x.accountRef??'')||
     !Array.isArray(x.scopes)||!x.scopes.every(s=>typeof s==='string'&&Object.values(SCOPE_BY_OPERATION).includes(s))||
     x.status!=='ACTIVE'||x.issuer!=='NEOPASS_SERVER')throw Error('untrusted_identity_or_scope');
  return x;
}
export function createScopedFinancialPlanner({resolveSession,resolveAccount}={}){
  if(typeof resolveSession!=='function'||typeof resolveAccount!=='function')throw TypeError('trusted_resolvers_required');
  return Object.freeze({
    async plan({sessionRef,intent}={}){
      if(typeof sessionRef!=='string'||!REF.test(sessionRef))throw Error('invalid_session_reference');
      // The browser-supplied workspace, account, and actor are only claims.
      const context=trustedContext(await resolveSession(sessionRef));
      if(!intent||typeof intent!=='object'||Array.isArray(intent))throw Error('invalid_intent');
      const op=intent.operation,scope=SCOPE_BY_OPERATION[op];
      if(!scope||!context.scopes.includes(scope))throw Error('scope_not_granted');
      if(!equal(intent.actorRef,context.actorRef)||!equal(intent.accountRef,context.accountRef)||
         intent.workspace!==context.workspace)throw Error('cross_workspace_or_actor_access_denied');
      const account=await resolveAccount({workspace:context.workspace,accountRef:context.accountRef});
      if(!account||!Object.isFrozen(account)||account.status!=='ACTIVE'||account.issuer!=='NEOBANK_SERVER'||
         !equal(account.accountRef,context.accountRef)||account.workspace!==context.workspace||
         !equal(account.actorRef,context.actorRef))throw Error('account_authority_not_verified');
      const planned=planFinancialOperation(intent);
      return Object.freeze({...planned,scopeVerified:true,accountVerified:true,executed:false,converted:false,postedToLedger:false,broadcast:false});
    }
  });
}
