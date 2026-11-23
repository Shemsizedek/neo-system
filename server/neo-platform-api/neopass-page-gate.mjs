// Dependencies must resolve verified server records, never browser claims.
export function createNeopassPageGate({resolveSession,resolveProofs,authorize,now=Date.now}={}) {
 if([resolveSession,resolveProofs,authorize].some(fn=>typeof fn!=='function'))throw Error('trusted_gate_dependencies_required');
 return async function gate(request,{service,walletProtected=false}={}) {
  const deny=(reason,next)=>({allowed:false,reason,next,walletKeyAccess:false});
  if(typeof service!=='string'||!service||service.length>128)return deny('invalid_service',null);
  const session=await resolveSession(request);
  if(!session?.subject)return deny('neopass_required','neopass');
  const proofs=await resolveProofs(session,service),time=now();
  if(!Array.isArray(proofs))return deny('neopass_required','neopass');
  const valid=(p,method,age)=>p?.method===method&&p.verified===true&&p.subject===session.subject&&p.audience===service&&Number.isFinite(p.authenticatedAt)&&p.authenticatedAt<=time&&time-p.authenticatedAt<age;
  const identity=proofs.find(p=>valid(p,'neopass',3600000));
  if(!identity)return deny('neopass_required','neopass');
  const passkey=proofs.find(p=>valid(p,'passkey',300000)&&p.userVerified===true&&p.authenticatedAt>=identity.authenticatedAt);
  if(!passkey)return deny('passkey_required','passkey');
  if(walletProtected&&!proofs.some(p=>valid(p,'neomask',300000)&&p.authenticatedAt>=passkey.authenticatedAt&&p.localUnlock===true&&p.walletProofVerified===true&&typeof p.address==='string'&&p.address))return deny('neomask_required','neomask');
  if(await authorize(session.subject,service)!==true)return deny('service_access_denied',null);
  return {allowed:true,subject:session.subject,service,walletKeyAccess:false};
 };
}
