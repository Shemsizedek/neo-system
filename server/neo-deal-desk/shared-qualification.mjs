import {buildOpportunity} from './core.mjs';
import {buildAgentDeskHandoff} from './deal-agent-handoff.mjs';
const money={'$75,000–$150,000':75000,'$150,000–$300,000':150000,'$300,000–$750,000':300000,'$750,000+':750000};
const days={'Within 30 days':30,'1–3 months':90,'3–6 months':180,'Exploratory':365};
export function qualifyInboundLead(lead){
 if(!lead?.id||!lead.consent)throw new Error('consented_lead_required');
 const intent=lead.service==='White-label Foundation'?'white label':lead.service==='Strategic Architecture'?'architecture':'custom build';
 return {id:lead.id,source:'customer_inquiry',status:'qualification_draft',opportunity:buildOpportunity({organization:lead.organization,intent,budgetUsd:money[lead.budget]||0,timelineDays:days[lead.timeline]||365}),actions:{outreach:false,contracts:false,payments:false},requiresOperatorReview:true};
}
export function qualifyAgentDiscovery(envelope){
 const handoff=buildAgentDeskHandoff(envelope);
 return {id:handoff.handoffId,source:'neo_deal_agent',status:'qualification_draft',opportunity:handoff.opportunity,provenance:handoff.provenance,actions:{outreach:false,contracts:false,payments:false},requiresOperatorReview:true};
}
