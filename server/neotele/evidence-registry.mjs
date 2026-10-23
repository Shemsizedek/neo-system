// NTEL-009 review registry. Caller supplies durable append-only persistence.
const TYPES=new Set(['carrierAgreement','esimProvisioning','coverage','emergencyServices','serviceFunding','memberDisclosures','etcDesignation','lifelineSac','usacEnrollmentWorkflow']);
export function createNeoTeleEvidenceRegistry({save,read,appendAudit}={}){
 if([save,read,appendAudit].some(fn=>typeof fn!=='function')) throw Error('persistent_adapters_required');
 return {
  async submit({type,reference,digest,submitter}={}){
   if(!TYPES.has(type)||typeof reference!=='string'||!reference||!/^sha256:[a-f0-9]{64}$/.test(digest||'')||!submitter) throw Error('invalid_evidence_submission');
   const record={type,reference,digest,submitter,status:'PENDING_REVIEW',reviewer:null};
   const saved=await save(record);
   await appendAudit({action:'EVIDENCE_SUBMITTED',type,reference,actor:submitter});
   return saved;
  },
  async review({reference,reviewer,decision,independentlyChecked=false}={}){
   const existing=await read(reference);
   if(!existing||!reviewer||reviewer===existing.submitter||!['APPROVED','REJECTED'].includes(decision)) throw Error('invalid_evidence_review');
   if(decision==='APPROVED'&&!independentlyChecked) throw Error('independent_verification_required');
   const result=await save({...existing,status:decision,reviewer});
   await appendAudit({action:'EVIDENCE_REVIEWED',reference,actor:reviewer,decision});
   return result;
  }
 };
}
export function operatorEvidenceDashboard(records=[]){
 return records.map(e=>({type:e.type,reference:e.reference,status:e.status,approved:e.status==='APPROVED'}));
}
