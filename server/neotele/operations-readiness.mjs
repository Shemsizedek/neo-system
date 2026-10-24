// NTEL-008: evidence-driven operational readiness, deliberately not a live provider adapter.
export const REQUIRED_OPERATIONS_EVIDENCE=Object.freeze([
 'carrierAgreement','esimProvisioning','coverage','emergencyServices','serviceFunding','memberDisclosures'
]);
export function assessNoogleReadiness({evidence={},plan={}}={}) {
 const controls=REQUIRED_OPERATIONS_EVIDENCE.map(key=>{
  const item=evidence[key];
  const verified=item?.verified===true && typeof item.reference==='string' && item.reference.trim().length>0
    && typeof item.verifiedAt==='string' && !Number.isNaN(Date.parse(item.verifiedAt));
  return {control:key,verified,reference:verified?item.reference:null};
 });
 const isLifeline=plan.fundingType==='LIFELINE';
 if(isLifeline){
  for(const key of ['etcDesignation','lifelineSac','usacEnrollmentWorkflow']) {
   const item=evidence[key];
   const verified=item?.verified===true && typeof item.reference==='string' && item.reference.trim().length>0;
   controls.push({control:key,verified,reference:verified?item.reference:null});
  }
 }
 const cost=Number(plan.wholesaleMonthlyCost);
 const committed=Number(plan.monthlyCommittedFunding);
 const subscribers=Number(plan.pilotSubscribers);
 const validBudget=Number.isFinite(cost)&&cost>=0&&Number.isFinite(committed)&&committed>=0&&Number.isInteger(subscribers)&&subscribers>0;
 const monthlyRequirement=validBudget?Math.round(cost*subscribers*100)/100:null;
 const funded=validBudget&&committed>=monthlyRequirement;
 return Object.freeze({provider:'Noogle Telecommunications',pilot:'chaplaincy',proposedMemberPrice:0,
  fundingType:plan.fundingType??'UNDECLARED',monthlyRequirement,monthlyCommittedFunding:validBudget?committed:null,
  fundingVerified:funded&&controls.find(x=>x.control==='serviceFunding').verified,
  evidenceControls:controls,allEvidenceVerified:controls.every(x=>x.verified),
  readiness:controls.every(x=>x.verified)&&funded?'EVIDENCE_REVIEW_READY':'BLOCKED',
  activationEnabled:false,
  note:'Evidence review readiness is not regulatory approval, a carrier contract certification, or activation authorization.'});
}
