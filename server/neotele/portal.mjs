import {deviceCompatibilitySummary,publicNeoTeleServiceView} from './enrollment.mjs';
export function createNeoTelePortal({resolveSession,loadChaplaincyMembership,listServices,listDevices}={}) {
 for(const [key,fn] of Object.entries({resolveSession,loadChaplaincyMembership,listServices,listDevices})) if(typeof fn!=='function') throw Error('adapter_required:'+key);
 return async function getPortal(sessionToken) {
  const session=await resolveSession(sessionToken);
  if(!session?.verified||!session.subject) throw Error('neopass_authentication_required');
  const member=await loadChaplaincyMembership(session.subject);
  if(!member?.verified||member.subject!==session.subject||member.cohort!=='chaplaincy'||member.status!=='ACTIVE') throw Error('chaplaincy_membership_required');
  const [services,devices]=await Promise.all([listServices(session.subject),listDevices(session.subject)]);
  if(!Array.isArray(services)||!Array.isArray(devices)) throw Error('invalid_provider_response');
  return Object.freeze({brand:'NeoTele',cohort:'chaplaincy',memberId:session.subject,
   services:services.map(service=>publicNeoTeleServiceView(service,session.subject)),
   devices:devices.filter(d=>d.subject===session.subject).map(d=>({deviceRef:d.deviceRef,compatibility:deviceCompatibilitySummary(d)})),
   provisioning:'CARRIER_NOT_CONNECTED',activationEnabled:false});
 };
}
