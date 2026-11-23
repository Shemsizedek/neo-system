const policies=Object.freeze({
 membership:['google'],wallet:['google','wallet'],protected:['google','passkey'],
 community:['google','wallet','passkey'],neomaskUnlock:['google','passkey']
});
// The proof resolver and membership check are server-owned. Never pass browser
// claims directly as proofs or use this decision to decrypt wallet keys remotely.
export function createNeopassAccessLevels({resolveProofs,isMember,now=Date.now}={}){
 if(typeof resolveProofs!=='function'||typeof isMember!=='function')throw Error('trusted_access_dependencies_required');
 return async function evaluate(sessionHandle,{service,level}={}){
  const required=policies[level];
  if(!required||typeof service!=='string'||!service||service.length>128)return {allowed:false,reason:'unknown_access_policy'};
  const proofs=await resolveProofs(sessionHandle,service);
  if(!Array.isArray(proofs))return {allowed:false,reason:'authentication_required'};
  const time=now(),base=proofs.find(p=>p.method==='google'&&p.verified===true&&p.audience===service&&typeof p.subject==='string'&&p.subject);
  if(!base)return {allowed:false,reason:'base_login_required',required};
  for(const method of required){
   const maxAge=method==='google'?3600000:300000;
   const proof=proofs.find(p=>p.method===method&&p.verified===true&&p.subject===base.subject&&p.audience===service&&Number.isFinite(p.authenticatedAt)&&p.authenticatedAt<=time&&time-p.authenticatedAt<maxAge&&(method!=='passkey'||p.userVerified===true));
   if(!proof)return {allowed:false,reason:'step_up_required',method,required};
  }
  if(await isMember(base.subject,service)!==true)return {allowed:false,reason:'service_membership_required'};
  return Object.freeze({allowed:true,subject:base.subject,service,level,verifiedMethods:[...required],walletKeyAccess:false});
 };
}
