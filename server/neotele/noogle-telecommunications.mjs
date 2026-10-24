// NTEL-007: Noogle Telecommunications is NeoTele's designated INTERNAL
// provider/orchestrator. A named provider does not establish FCC ETC status,
// commercial carrier wholesale agreement or operational eSIM SM-DP+ access.
export const NOOGLE_TELECOM=Object.freeze({
 id:'noogle-telecommunications',
 name:'Noogle Telecommunications',
 role:'NEOTELE_PRIMARY_PROVIDER',
 transport:'NOOGLE_FI',
 operations:'SANDBOX_ONLY',
 carrierAgreementVerified:false,
 lifelineEtcVerified:false,
 lifelineSac:null,
 esimProvisioningVerified:false,
 pilotCohort:'chaplaincy'
});
export const PILOT_SERVICE=Object.freeze({
 id:'chaplaincy-sponsored-connectivity',
 name:'NeoTele Chaplaincy Sponsored Service',
 advertisedMonthlyPrice:'$0 (proposed; not available)',
 eligibility:'ACTIVE_CHAPLAINCY_MEMBER_AND_AUTHORIZED_PARTNER_APPROVAL',
 available:false,
 subsidySource:'NOT_ESTABLISHED',
 coverage:'NOT_VERIFIED',
 esimDelivery:'DISABLED',
 emergencyCalling:'NOT_VERIFIED'
});
export function getNoogleProviderDirectory(){
 return Object.freeze({operator:NOOGLE_TELECOM,plans:[PILOT_SERVICE],status:'NOT_READY_FOR_ENROLLMENT'});
}
export function validateNoogleCarrierEvidence(evidence){
 if(!evidence||evidence.providerId!==NOOGLE_TELECOM.id) throw Error('noogle_provider_evidence_required');
 if(evidence.contractVerified!==true||evidence.carrierProvisioningVerified!==true) throw Error('carrier_contract_and_provisioning_not_verified');
 if(evidence.lifelineOffering===true&&(evidence.etcDesignationVerified!==true||typeof evidence.sac!=='string'||!evidence.sac.trim())) throw Error('lifeline_authorization_not_verified');
 return {accepted:true,liveProvisioningEnabled:false,reason:'MANUAL_CERTIFICATION_AND_RELEASE_GATE_REQUIRED'};
}
