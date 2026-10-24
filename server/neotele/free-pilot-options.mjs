// NTEL-015: documented externally offered programs, not Noogle carrier API access.
// Keep promotional terms under periodic manual verification; fail closed.
export const NEOTELE_PILOT_OPTIONS=Object.freeze([
 Object.freeze({id:'verizon-trial',provider:'Verizon',category:'FREE_NETWORK_TRIAL',durationDays:30,requiresPortIn:false,
   requiresCompatibleUnlockedEsimPhone:true,carrierApiAccess:false,subscriberEligibility:'CARRIER_CHECK_REQUIRED',
   url:'https://www.verizon.com/plans/free-trial',usage:'FIRST_DEVICE_CONNECTIVITY_TEST'}),
 Object.freeze({id:'tmobile-trial',provider:'T-Mobile',category:'FREE_NETWORK_TRIAL',durationDays:30,requiresPortIn:false,
   requiresCompatibleUnlockedEsimPhone:true,carrierApiAccess:false,subscriberEligibility:'CARRIER_CHECK_REQUIRED',
   url:'https://www.t-mobile.com/offers/free-trial/',usage:'ALTERNATE_DEVICE_CONNECTIVITY_TEST'}),
 Object.freeze({id:'usmobile-trial',provider:'US Mobile',category:'FREE_NETWORK_TRIAL',durationDays:30,requiresPortIn:true,
   requiresCompatibleUnlockedEsimPhone:true,carrierApiAccess:false,subscriberEligibility:'NUMBER_TRANSFER_REQUIRED',
   url:'https://www.usmobile.com/get-started',usage:'OPTIONAL_PORT_IN_TEST'}),
 ...['TruConnect','AirTalk Wireless','Life Wireless'].map(name=>Object.freeze({
   id:name.toLowerCase().replaceAll(' ','-'),provider:name,category:'LIFELINE_REFERRAL',
   durationDays:null,requiresPortIn:null,requiresCompatibleUnlockedEsimPhone:null,
   carrierApiAccess:false,subscriberEligibility:'NATIONAL_VERIFIER_AND_CARRIER_APPROVAL_REQUIRED',
   url:null,usage:'CONDITIONAL_SUSTAINED_SERVICE',esimAvailability:'VERIFY_WITH_PROVIDER'
 }))
]);
export function listNeoTeleTrialOptions({kind}={}){
 return NEOTELE_PILOT_OPTIONS.filter(option=>!kind||option.category===kind);
}
export function createNeoTelePilotEvaluation({optionId,deviceCompatibilityVerified=false,carrierEnrollmentConfirmed=false}={}){
 const selected=NEOTELE_PILOT_OPTIONS.find(x=>x.id===optionId);
 if(!selected)throw Error('unsupported_service_option');
 return Object.freeze({optionId,category:selected.category,
  externalEnrollmentRequired:true,deviceCompatibilityVerified,carrierEnrollmentConfirmed,
  networkOperational:carrierEnrollmentConfirmed&&deviceCompatibilityVerified,
  neoTeleProviderProvisioned:false,neoTeleTokenPublished:false,
  activationCredentialsStored:false,
  // Never mark a third-party subscription as a Noogle-issued line.
  accountRelationship:'EXTERNAL_CARRIER_SUBSCRIBER'});
}
