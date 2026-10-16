// NTEL-004: Lifeline-inspired enrollment orchestration.
// NeoTele is not an authorized Lifeline ETC or eSIM carrier in this module.
export const ONBOARDING_STEPS=Object.freeze([
 'DEVICE_CHECK','PROVIDER_SELECTION','ELIGIBILITY_REFERRAL',
 'APPLICATION_REVIEW','CARRIER_APPROVAL','ESIM_DELIVERY','DEVICE_INSTALL','ACTIVATION_CONFIRMATION'
]);
export function makeNeoTeleOnboarding({memberId,deviceRef,zipCode}={}) {
 if(typeof memberId!=='string'||!memberId.trim()) throw Error('member_required');
 if(typeof deviceRef!=='string'||!deviceRef.trim()) throw Error('device_required');
 if(!/^\\d{5}$/.test(zipCode??'')) throw Error('valid_zip_required');
 return {memberId,deviceRef,zipCode,step:'DEVICE_CHECK',providerId:null,
  applicationRef:null,carrierApproval:false,activationConfirmed:false,
  lifelineStatus:'NOT_VERIFIED',serviceStatus:'NOT_ACTIVE'};
}
export function advanceNeoTeleOnboarding(record,next,{device,provider,eligibility,carrier}={}) {
 if(!record||ONBOARDING_STEPS.indexOf(next)!==ONBOARDING_STEPS.indexOf(record.step)+1) throw Error('invalid_onboarding_transition');
 if(next==='PROVIDER_SELECTION' && !(device?.verified&&device?.esimSupported&&device?.unlocked)) throw Error('verified_device_required');
 if(next==='ELIGIBILITY_REFERRAL' && !(provider?.authorized&&provider?.coversZip&&provider?.offersEsim)) throw Error('verified_provider_required');
 if(next==='APPLICATION_REVIEW' && eligibility?.referralAcknowledged!==true) throw Error('application_referral_required');
 if(next==='CARRIER_APPROVAL' && !(carrier?.approvalVerified&&carrier?.applicationRef)) throw Error('carrier_approval_required');
 if(next==='ESIM_DELIVERY' && carrier?.profileDeliveryConfirmed!==true) throw Error('carrier_profile_delivery_required');
 if(next==='DEVICE_INSTALL' && carrier?.installationConfirmed!==true) throw Error('device_install_confirmation_required');
 if(next==='ACTIVATION_CONFIRMATION' && carrier?.networkActivationVerified!==true) throw Error('carrier_network_activation_required');
 return {...record,step:next,
  providerId:next==='ELIGIBILITY_REFERRAL'?provider.id:record.providerId,
  applicationRef:next==='CARRIER_APPROVAL'?carrier.applicationRef:record.applicationRef,
  carrierApproval:next==='CARRIER_APPROVAL'?true:record.carrierApproval,
  activationConfirmed:next==='ACTIVATION_CONFIRMATION'?true:record.activationConfirmed,
  serviceStatus:next==='ACTIVATION_CONFIRMATION'?'ACTIVE':'NOT_ACTIVE'};
}
export function publicNeoTeleOnboarding(record,viewerId){
 if(!record||record.memberId!==viewerId) throw Error('onboarding_access_denied');
 const {memberId,deviceRef,step,providerId,carrierApproval,serviceStatus}=record;
 return {memberId,deviceRef,step,providerId,carrierApproval,serviceStatus,
  instruction:step==='DEVICE_CHECK'?'Check eSIM support, carrier unlock and connectivity.':
  step==='ELIGIBILITY_REFERRAL'?'Use the approved provider or National Verifier to determine eligibility.':
  step==='ESIM_DELIVERY'?'Obtain eSIM installation instructions securely from the carrier.':
  step==='DEVICE_INSTALL'?'Follow carrier installation steps while connected to Wi-Fi.':
  'Continue through provider-supported verification.'};
}
