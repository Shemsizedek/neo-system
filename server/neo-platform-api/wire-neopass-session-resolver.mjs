// NEO-WIRE-005H: require the platform's actual session service.
// Do not use unverified request headers as proof of membership.
export function createWireNeopassSessionResolver({subjectResolver,authService}={}) {
 if(typeof subjectResolver!=='function'||typeof authService?.session!=='function') {
  throw new Error('verified_neopass_session_service_required');
 }
 return async req=>{
  const subject=await subjectResolver(req);
  if(!subject) return null;
  const member=await authService.session(subject,req?.neopassClaims||{});
  if(!member||member.neopassStatus!=='authenticated') return null;
  const id=member.id||member.memberId||member.subject;
  if(typeof id!=='string'||!id) return null;
  return {id};
 };
}
