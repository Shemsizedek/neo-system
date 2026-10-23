import {createNeoTeleEnrollment} from './enrollment.mjs';
import {createNeoTelePortal} from './portal.mjs';
const respond=(status,body)=>({status,headers:{'content-type':'application/json','cache-control':'no-store'},body});
const safeError=(error)=>/neopass_authentication_required/.test(error.message)?401:/chaplaincy_membership_required|service_access_denied|guardian_device_not_eligible/.test(error.message)?403:400;
export function createNeoTeleHttpHandlers({resolveSession,loadChaplaincyMembership,loadGuardianDevice,saveRequest,audit,listServices,listDevices,listProviders,recordConsent}={}) {
 const enroll=createNeoTeleEnrollment({resolveSession,loadChaplaincyMembership,loadGuardianDevice,saveRequest,audit});
 const portal=createNeoTelePortal({resolveSession,loadChaplaincyMembership,listServices,listDevices});
 if(typeof listProviders!=='function'||typeof recordConsent!=='function') throw Error('adapter_required');
 async function authenticate(token){
  const identity=await resolveSession(token);
  if(!identity?.verified||!identity.subject) throw Error('neopass_authentication_required');
  const m=await loadChaplaincyMembership(identity.subject);
  if(!m?.verified||m.subject!==identity.subject||m.status!=='ACTIVE'||m.cohort!=='chaplaincy') throw Error('chaplaincy_membership_required');
  return identity;
 }
 return async function handle({method,path,sessionToken,body={},originVerified=false}={}){
  // Caller must authenticate cookies, CSRF protection and same-origin rules upstream.
  // A false origin verdict blocks mutations even when session is authenticated.
  try{
   if(method==='GET'&&path==='/neotele/v1/portal') return respond(200,await portal(sessionToken));
   if(method==='GET'&&path==='/neotele/v1/providers'){
    const user=await authenticate(sessionToken);
    const providers=await listProviders({subject:user.subject});
    if(!Array.isArray(providers)) throw Error('provider_directory_unavailable');
    return respond(200,{providers:providers.filter(p=>p.verified===true&&p.authorized===true).map(p=>({
     id:p.id,name:p.name,offersEsim:p.offersEsim===true,coverageVerified:p.coverageVerified===true,
     lifelineParticipationVerified:p.lifelineParticipationVerified===true
    }))});
   }
   if(method==='POST'&&path==='/neotele/v1/enroll'){
    if(!originVerified) return respond(403,{error:'origin_not_verified'});
    if(body?.consentAccepted!==true||typeof body.consentVersion!=='string'||!body.consentVersion.trim()) return respond(400,{error:'explicit_consent_required'});
    const identity=await authenticate(sessionToken);
    await recordConsent({subject:identity.subject,consentVersion:body.consentVersion,action:'NEOTELE_REQUEST',deviceRef:body.deviceRef});
    return respond(202,await enroll({sessionToken,deviceRef:body.deviceRef,idempotencyKey:body.idempotencyKey}));
   }
   return respond(404,{error:'route_not_found'});
  }catch(error){return respond(safeError(error),{error:/^(neopass_authentication_required|chaplaincy_membership_required|guardian_device_not_eligible|service_access_denied)$/.test(error.message)?error.message:'request_rejected'});}
 };
}
