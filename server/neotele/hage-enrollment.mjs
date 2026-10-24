import {HAGE_NEOTELE_COMMANDS} from './hage-device-bridge.mjs';
// Language-independent command IDs. Nuwaubian translations are not supplied
// until reviewed by a competent language steward.
export const NEOTELE_LEXICON=Object.freeze({
 'en':Object.freeze({'eSIM status':'neotele.device.esim_status','Network status':'neotele.device.network_status','Device health':'neotele.device.health'}),
 'hage':Object.freeze({'NEOTELE.ESIM.STATUS':'neotele.device.esim_status','NEOTELE.NETWORK.STATUS':'neotele.device.network_status','NEOTELE.DEVICE.HEALTH':'neotele.device.health'}),
 'nuwaubian':Object.freeze({})
});
export function resolveNeoTeleCommand({language,phrase}={}){
 const id=NEOTELE_LEXICON[language]?.[phrase];
 if(!id||!Object.hasOwn(HAGE_NEOTELE_COMMANDS,id))throw Error('unreviewed_or_unsupported_command');
 return Object.freeze({commandId:id,capability:HAGE_NEOTELE_COMMANDS[id].capability});
}
export function createNeoTeleDeviceEnrollment({resolveSession,verifyGuardian,storeEnrollment}={}){
 if([resolveSession,verifyGuardian,storeEnrollment].some(f=>typeof f!=='function'))throw Error('trusted_adapters_required');
 return async function enroll({sessionToken,deviceId,guardianAssertion}={}){
  if(typeof deviceId!=='string'||!deviceId)throw Error('device_id_required');
  const session=await resolveSession(sessionToken);
  if(!session?.verified||!session.subject)throw Error('neopass_authentication_required');
  const proof=await verifyGuardian({subject:session.subject,deviceId,assertion:guardianAssertion,purpose:'NEOTELE_READONLY_DIAGNOSTICS'});
  if(!proof?.verified||proof.subject!==session.subject||proof.deviceId!==deviceId||!proof.challengeConsumed)throw Error('guardian_enrollment_verification_required');
  const record=await storeEnrollment({subject:session.subject,deviceId,capabilities:['device.esim.read','device.network.read','device.health.read'],state:'PENDING_DEVICE_CONFIRMATION'});
  return Object.freeze({deviceId:record.deviceId,state:record.state,remoteShellEnabled:false,simProvisioningEnabled:false});
 };
}
