const money = value => Number.isFinite(Number(value)) ? new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(value)) : null;
const clean = (value,max=500) => String(value ?? '').trim().slice(0,max);

export function buildProposal(opportunity = {}, scope = {}) {
  if (!opportunity?.dealClass || !opportunity?.quote) throw new Error('opportunity_required');
  const q=opportunity.quote;
  const implementation=q.ask ? money(q.ask) : 'Terms subject to approved financing/compliance lane';
  const recurring=q.recurring?.amount ? `${money(q.recurring.amount)} / ${q.recurring.cadence}` :
    q.recurring?.range ? `${money(q.recurring.range[0])}–${money(q.recurring.range[1])} / ${q.recurring.cadence}` : null;

  return {
    kind:'non_binding_proposal',
    version:'1.0',
    prospect:opportunity.prospect,
    dealClass:opportunity.dealClass,
    title:clean(scope.title || `NEO System Proposal — ${opportunity.prospect?.organization || opportunity.prospect?.name || 'Prospect'}`,160),
    executiveSummary:clean(scope.executiveSummary || 'Deploy a tailored NEO operating environment using approved modules, integrations and governance controls.',1200),
    outcomes:Array.isArray(scope.outcomes) ? scope.outcomes.slice(0,8).map(v=>clean(v,240)) : [],
    modules:Array.isArray(scope.modules) ? scope.modules.slice(0,20).map(v=>clean(v,120)) : [],
    implementationAsk:implementation,
    recurring,
    assumptions:Array.isArray(scope.assumptions) ? scope.assumptions.slice(0,12).map(v=>clean(v,300)) : [],
    exclusions:Array.isArray(scope.exclusions) ? scope.exclusions.slice(0,12).map(v=>clean(v,300)) : [],
    approvalRequired:Boolean(q.approvalRequired),
    approvalReasons:q.approvalReasons || [],
    disclaimer:'Non-binding commercial discussion draft. Final scope, pricing, legal terms, availability, compliance requirements and execution require authorized approval.',
  };
}

export function nextFollowUp({ stage='contacted', lastContactAt, engagement=0 } = {}) {
  const base = lastContactAt ? new Date(lastContactAt) : new Date();
  if (Number.isNaN(base.getTime())) throw new Error('invalid_last_contact_at');
  const days = stage==='negotiating' ? 2 : engagement >= 8 ? 2 : engagement >= 5 ? 4 : 7;
  const next = new Date(base.getTime() + days*86400000);
  return {
    stage,
    cadenceDays:days,
    nextFollowUpAt:next.toISOString(),
    action: stage==='negotiating' ? 'prepare_negotiation_follow_up' : 'prepare_value_follow_up',
  };
}

export function buildApprovalQueueItem(opportunity = {}, draft = null) {
  const reasons=opportunity?.quote?.approvalReasons || [];
  if (!opportunity?.quote?.approvalRequired && reasons.length===0) return null;
  return {
    type:'deal_approval',
    status:'pending',
    owner:'NIA-001 ORIGIN',
    requestedBy:'NIA-013 DEALDESK',
    prospect:opportunity.prospect,
    dealClass:opportunity.dealClass,
    reasons,
    ask:opportunity.quote?.ask ?? null,
    range:opportunity.quote?.range ?? null,
    draft,
    requiredDecision:'approve_reject_or_return_for_revision',
    silenceIsApproval:false,
  };
}
