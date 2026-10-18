/** G004 application-layer guardrails; NOT a substitute for database authorization. */
import {type Journal,validateJournal} from './ledger';
export type TreasuryRole='TRUSTEE'|'TREASURER'|'ERA_OFFICER'|'AUDITOR'|'MEMBER';
export type Principal={id:string;roles:TreasuryRole[];templeIds:string[]};
export type Approval={actorId:string;decision:'APPROVE'|'REJECT';recordedAt:string};
export type Distribution={id:string;beneficiaryId:string;templeId:string;fundId:string;amountMinor:bigint;currency:string;state:'DRAFT'|'PENDING'|'APPROVED'|'REJECTED'|'SETTLED'};
export function mayReadMemberAccount(actor:Principal,ownerId:string,templeId:string):boolean{
 return actor.id===ownerId || (actor.templeIds.includes(templeId)&&actor.roles.some(r=>r==='TREASURER'||r==='ERA_OFFICER'));
}
export function mayApproveDistribution(actor:Principal,d:Distribution):boolean{
 return actor.templeIds.includes(d.templeId)&&actor.roles.includes('TRUSTEE')&&d.state==='PENDING';
}
export function approveDistribution(d:Distribution,approvals:Approval[],actor:Principal):Distribution{
 if(!mayApproveDistribution(actor,d))throw new Error('Not authorized');
 const accepted=new Set(approvals.filter(a=>a.decision==='APPROVE').map(a=>a.actorId));
 if(!accepted.has(actor.id))throw new Error('Actor approval is missing');
 if(approvals.some(a=>a.decision==='REJECT'))throw new Error('Rejected request cannot be approved');
 return {...d,state:accepted.size>=2?'APPROVED':'PENDING'};
}
export function authorizePosting(j:Journal,approvals:Approval[],actor:Principal):void{
 if(!actor.roles.includes('TREASURER'))throw new Error('Treasurer required');
 const distinct=new Set(approvals.filter(a=>a.decision==='APPROVE').map(a=>a.actorId));
 if(distinct.size<2||!distinct.has(actor.id))throw new Error('Two independent approvals required');
 if(approvals.some(a=>a.decision==='REJECT'))throw new Error('Rejected journal');
 const errors=validateJournal({...j,status:'POSTED',approvedBy:[...distinct]});
 if(errors.length)throw new Error(errors.join('; '));
}
/** Never settle or mutate a database based on these client-side checks alone. */
