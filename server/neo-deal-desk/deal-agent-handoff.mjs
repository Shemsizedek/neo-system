/**
 * CASHFLOW-005 — NEO Deal Agent -> NEO Deal Desk handoff.
 * Read-only planning. No transaction, CRM write, outreach or payments.
 */
import { prospectFromCrawlerEnvelope, prepareProspect, buildOutreachBrief } from './prospect-pipeline.mjs';

const clean=(v,n=160)=>typeof v==='string'?v.trim().slice(0,n):'';
export function buildAgentDeskHandoff(input={}) {
  if (!input || typeof input!=='object' || Array.isArray(input)) throw new Error('invalid_handoff');
  if (input.sourceAgent!=='NEO Deal Agent') throw new Error('unrecognized_agent');
  if (!clean(input.agentDealId)) throw new Error('agent_deal_id_required');
  if (!input.evidence || !Array.isArray(input.evidence.sources) || input.evidence.sources.length===0) throw new Error('source_evidence_required');
  if (input.liveTransaction===true || input.requestedAction==='execute' || input.requestedAction==='collect_payment') throw new Error('execution_disabled');
  const envelope={provenanceRequired:true,createdAt:clean(input.observedAt),sourceMeta:{adapter:'neo-deal-agent'}};
  const candidate={
    organization:clean(input.organization,140),
    sector:clean(input.sector,80),
    intent:clean(input.intent,160),
    publicContactUrl:clean(input.publicContactUrl,512),
    decisionAuthority:clean(input.decisionAuthority,80),
    decisionMakerName:clean(input.decisionMakerName,100),
    budgetUsd:input.budgetUsd,
    timelineDays:input.timelineDays,
    sources:input.evidence.sources
  };
  const normalized=prospectFromCrawlerEnvelope(envelope,candidate);
  const prepared=prepareProspect(normalized,{asOf:clean(input.observedAt)||undefined});
  return {
    version:'CASHFLOW-005',
    handoffId:clean(input.agentDealId,128),
    sourceAgent:'NEO Deal Agent',
    destination:'NIA-013 NEO Deal Desk',
    state:'review_required',
    transactionMode:'disabled',
    provenance:prepared.provenance,
    opportunity:prepared.opportunity,
    proposal:prepared.proposal,
    outreachDraft:buildOutreachBrief(prepared),
    approvalQueueItem:prepared.approvalQueueItem,
    controls:{
      crmWrite:false,
      sendOutreach:false,
      signAgreement:false,
      initiatePayment:false,
      tokenTransfer:false,
      finalApproval:'authorized_human'
    }
  };
}
