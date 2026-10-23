import {requestNeoTeleService} from './core.mjs';

// NTEL-002: server-side identity/CRM/device adapters. No network calls or issuance.
// Adapters MUST return verified records obtained from trusted backends, not request body.
export function createNeoTeleEnrollment({resolveSession,loadChaplaincyMembership,loadGuardianDevice,saveRequest,audit}={}) {
  for(const [name,fn] of Object.entries({resolveSession,loadChaplaincyMembership,loadGuardianDevice,saveRequest,audit})) {
    if(typeof fn!=='function') throw Error('adapter_required:'+name);
  }
  return async function enroll({sessionToken,deviceRef,idempotencyKey}={}) {
    if(typeof sessionToken!=='string'||!sessionToken || typeof deviceRef!=='string'||!deviceRef || typeof idempotencyKey!=='string'||!idempotencyKey) throw Error('missing_enrollment_parameters');
    const session=await resolveSession(sessionToken);
    if(!session?.verified || !session.subject) throw Error('neopass_authentication_required');
    const membership=await loadChaplaincyMembership(session.subject);
    if(!membership?.verified || membership.status!=='ACTIVE' || membership.cohort!=='chaplaincy' || membership.subject!==session.subject) throw Error('chaplaincy_membership_required');
    const device=await loadGuardianDevice({subject:session.subject,deviceRef});
    if(!device?.verified || device.subject!==session.subject || device.deviceRef!==deviceRef || device.esimSupported!==true || device.unlocked!==true) throw Error('guardian_device_not_eligible');
    const request=requestNeoTeleService({memberId:session.subject,cohort:'chaplaincy',device});
    // saveRequest must atomically enforce a unique (subject,idempotencyKey)
    // tuple to avoid duplicate lines or provisioning across retries.
    const saved=await saveRequest({request,idempotencyKey,subject:session.subject});
    await audit({type:'NEOTELE_ENROLLMENT_REQUESTED',subject:session.subject,deviceRef,state:saved.state});
    return publicNeoTeleServiceView(saved,session.subject);
  };
}

export function publicNeoTeleServiceView(record,viewerSubject) {
  if(!record||!viewerSubject||record.memberId!==viewerSubject) throw Error('service_access_denied');
  return Object.freeze({
    brand:'NeoTele',memberId:record.memberId,deviceRef:record.deviceRef,state:record.state,
    providerStatus:record.providerId?'PROVIDER_ASSOCIATED':'NOT_CONNECTED',
    eSimStatus:record.state==='ACTIVE'?'CARRIER_CONFIRMED':'NOT_ACTIVE',
    activationAvailable:false
  });
}

export function deviceCompatibilitySummary(device) {
  if(!device?.verified) return {eligible:false,reason:'DEVICE_NOT_VERIFIED'};
  if(device.esimSupported!==true) return {eligible:false,reason:'ESIM_UNSUPPORTED'};
  if(device.unlocked!==true) return {eligible:false,reason:'DEVICE_LOCKED_OR_UNKNOWN'};
  return {eligible:true,reason:'DEVICE_PRELIMINARILY_ELIGIBLE_CARRIER_CHECK_REQUIRED'};
}
