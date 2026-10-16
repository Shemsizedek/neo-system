// NeoTele Gate 001 — Chaplaincy-first cellular service orchestration.
// No eSIM profile issuance, QR activation credential or carrier request is implemented.
export const NEOTELE_BRAND = Object.freeze({
  name: 'NeoTele',
  network: 'NEO Wire',
  providerFabric: 'Noogle Fi',
  firstCohort: 'chaplaincy',
  provisioningMode: 'PROVIDER_REQUIRED'
});

export const SERVICE_STATES = Object.freeze([
  'REQUESTED', 'ELIGIBILITY_PENDING', 'ELIGIBLE',
  'PROVIDER_PENDING', 'READY_FOR_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'CANCELLED'
]);
const transitions = {
  REQUESTED:['ELIGIBILITY_PENDING','CANCELLED'],
  ELIGIBILITY_PENDING:['ELIGIBLE','CANCELLED'],
  ELIGIBLE:['PROVIDER_PENDING','CANCELLED'],
  PROVIDER_PENDING:['READY_FOR_ACTIVATION','CANCELLED'],
  READY_FOR_ACTIVATION:['ACTIVE','CANCELLED'],
  ACTIVE:['SUSPENDED','CANCELLED'],
  SUSPENDED:['ACTIVE','CANCELLED'],
  CANCELLED:[]
};

export function requestNeoTeleService({memberId,cohort,device}={}) {
  if(typeof memberId!=='string'||!memberId.trim()) throw Error('verified_member_required');
  if(cohort!=='chaplaincy') throw Error('pilot_cohort_restricted');
  if(!device || device.esimSupported!==true || device.unlocked!==true) throw Error('device_eligibility_pending');
  // Member and device data must be resolved from authenticated CRM & device registry
  // in production; never trust user-submitted role claims for authorization.
  return {brand:NEOTELE_BRAND.name,memberId,cohort,
    deviceRef:device.deviceRef??null,state:'REQUESTED',
    providerId:null,profileId:null,phoneNumber:null,activationUrl:null};
}

export function transitionNeoTeleService(record,next,{providerEvidence}={}) {
  if(!record||!SERVICE_STATES.includes(next)) throw Error('invalid_service_transition');
  if(!transitions[record.state]?.includes(next)) throw Error('transition_not_permitted');
  if(['READY_FOR_ACTIVATION','ACTIVE'].includes(next) && !providerEvidence?.verified) {
    throw Error('verified_carrier_provisioning_required');
  }
  if(next==='ACTIVE' && !providerEvidence?.activationConfirmed) throw Error('activation_not_confirmed');
  return {...record,state:next};
}

export function describeNeoTeleIntegration() {
 return Object.freeze({
  identity:'NEOpass / Chaplaincy CRM',
  device:'NEO Guardian device registry',
  service:'NeoTele membership and eSIM lifecycle',
  routing:'NEO Wire / Noogle Fi provider fabric',
  messaging:'NEO Telegram / authorized SMS and VoIP provider adapters',
  payments:'NEO Wire billing with BTC, Lightning and Counterparty review-only until enabled',
  carrier:'unconnected — operator/MVNO contract and SM-DP+ integration required',
  activation:'disabled'
 });
}
