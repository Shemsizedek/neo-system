// NTEL-016: data-minimized Android eSIM device checks; observations must come from
// trusted device attestation or explicit user confirmation, never an IMEI in telemetry.
import {NEOTELE_PILOT_OPTIONS} from './free-pilot-options.mjs';
export const ANDROID_PILOT_CHECKLIST=Object.freeze([
 {id:'euicc',label:'Android reports active eUICC / eSIM capability',source:'EuiccManager.isEnabled'},
 {id:'unlocked',label:'Carrier confirms phone is unlocked',source:'carrier/user confirmation'},
 {id:'wifi',label:'Wi-Fi available for authorized carrier profile download',source:'local device'},
 {id:'trial',label:'Trial eligibility verified on the carrier site',source:'external carrier'},
 {id:'approval',label:'Member authorizes optional diagnostics',source:'explicit consent'}
]);
export function evaluateAndroidPilot({euiccEnabled,carrierUnlocked,wifiAvailable,carrierOptionId,trialEligible,diagnosticsConsent}={}){
 const carrier=NEOTELE_PILOT_OPTIONS.find(p=>p.id===carrierOptionId);
 if(!carrier||carrier.category!=='FREE_NETWORK_TRIAL') throw Error('trial_provider_required');
 const checklist=[
  {id:'euicc',complete:euiccEnabled===true},
  {id:'unlocked',complete:carrierUnlocked===true},
  {id:'wifi',complete:wifiAvailable===true},
  {id:'trial',complete:trialEligible===true},
  {id:'approval',complete:diagnosticsConsent===true}
 ];
 return Object.freeze({provider:carrier.provider,checklist,readyForCarrierSelfEnrollment:checklist.every(x=>x.complete),
  enrollmentUrl:carrier.url,neoTeleIssuer:false,carrierProfileInstallationEnabled:false});
}
export function normalizeNetworkObservation({consent,observedAt,transport,signalLevel,validated,roaming}={}){
 if(consent!==true) throw Error('diagnostics_consent_required');
 if(typeof observedAt!=='string'||!Number.isFinite(Date.parse(observedAt))) throw Error('invalid_observation_time');
 if(!['CELLULAR','WIFI','NONE'].includes(transport)) throw Error('invalid_transport');
 if(!Number.isInteger(signalLevel)||signalLevel<0||signalLevel>4) throw Error('invalid_signal_level');
 return Object.freeze({observedAt,transport,signalLevel,validated:validated===true,roaming:roaming===true,
  imei:null,eid:null,iccid:null,imsi:null,phoneNumber:null,subscriberLocation:null,
  diagnosticsOnly:true,carrierControl:false});
}
