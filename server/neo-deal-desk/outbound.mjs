const clean=(v,max=4000)=>String(v??'').trim().slice(0,max);

export const REPLY_CLASSES=Object.freeze([
  'positive_interest',
  'request_information',
  'referral',
  'not_now',
  'objection_budget',
  'objection_fit',
  'objection_timing',
  'unsubscribe',
  'negative',
  'unknown'
]);

export function composeOutreach(prepared={},draft={}){
  const p=prepared.normalized||{},o=prepared.opportunity||{};
  const investor=o.dealClass==='equity_investment'||(o.quote?.approvalReasons||[]).includes('securities_solicitation');
  const subject=clean(draft.subject||`NEO System opportunity for ${p.organization||p.name}`,220);
  const body=clean(draft.body||[
    `Hello ${p.decisionMakerName||p.decisionAuthority||'there'},`,
    '',
    `I’m reaching out regarding ${p.organization||p.name}. Based on your organization’s public work in ${p.intent||'digital modernization'}, there may be a fit for a tailored NEO System deployment.`,
    '',
    'NEO is designed as a governed operating layer for institutional knowledge, workflows, AI orchestration, records, and role-aware automation without requiring an organization to discard its existing systems.',
    '',
    'If useful, I can provide a concise architecture brief focused on your current environment and where NEO could integrate.',
    '',
    'Regards,',
    'NEO Deal Desk'
  ].join('\n'),12000);

  return {
    prospectId:clean(draft.prospectId||p.id||p.organization||p.name,120).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),
    organization:clean(p.organization||p.name,160),
    decisionMaker:clean(p.decisionMakerName,140),
    decisionRole:clean(p.decisionAuthority,140),
    publicContact:clean(draft.publicContact||p.publicContactUrl,500),
    channel:clean(draft.channel||'public_business_contact_route',80),
    provider:clean(draft.provider||'NEO_MAIL',80),
    dealClass:clean(o.dealClass,80),
    subject,
    body,
    status:investor?'pending_approval':'draft',
    approvalClass:investor?'securities_compliance':'commercial',
    approvalReasons:[...(o.quote?.approvalReasons||[])],
    nextAction:investor?'obtain_compliance_and_executive_approval':'obtain_executive_send_approval'
  };
}

export async function approveOutreach(store,id,{actor,complianceApproved=false}={}){
  const item=await store.get(id);if(!item)throw new Error('outreach_not_found');
  if(item.approvalClass==='securities_compliance'&&!complianceApproved)throw new Error('securities_compliance_approval_required');
  if(!['draft','pending_approval','failed'].includes(item.status))throw new Error('outreach_not_approvable');
  return store.update(id,{
    status:'approved',
    approvedBy:clean(actor||'executive-admin',160),
    approvedAt:new Date().toISOString(),
    nextAction:'handoff_to_provider'
  },actor||'executive-admin');
}

export async function handoffOutreach(store,id,{actor='NIA-013 DEALDESK',providerRef}={}){
  const item=await store.get(id);if(!item)throw new Error('outreach_not_found');
  if(item.status!=='approved')throw new Error('outreach_not_approved');
  if(item.approvalClass==='securities_compliance'&&!item.approvedBy)throw new Error('securities_compliance_approval_required');
  return store.update(id,{
    status:'awaiting_provider',
    providerRef:clean(providerRef||`${item.provider.toLowerCase()}:${id}:${Date.now()}`,240),
    nextAction:'await_provider_receipt'
  },actor);
}

export async function recordDelivery(store,id,{outcome,providerRef,receipt,error,actor='NEO_MAIL'}={}){
  const item=await store.get(id);if(!item)throw new Error('outreach_not_found');
  if(item.status!=='awaiting_provider'&&item.status!=='failed')throw new Error('outreach_not_awaiting_provider');
  const delivered=String(outcome||'').toLowerCase()==='delivered';
  const failed=String(outcome||'').toLowerCase()==='failed';
  if(!delivered&&!failed)throw new Error('invalid_provider_outcome');
  return store.update(id,{
    status:delivered?'delivered':'failed',
    providerRef:clean(providerRef||item.providerRef,240),
    providerReceipt:receipt||{error:clean(error,1000)},
    nextAction:delivered?'monitor_for_reply':'review_delivery_failure'
  },actor);
}

export function classifyReply(text=''){
  const v=clean(text,12000).toLowerCase();
  if(/unsubscribe|remove me|stop email|do not contact/.test(v))return 'unsubscribe';
  if(/interested|let.?s talk|schedule|meeting|call|sounds good|explore/.test(v))return 'positive_interest';
  if(/send.*information|more info|details|deck|proposal|brief/.test(v))return 'request_information';
  if(/talk to|contact|reach out to|forwarded|looping in/.test(v))return 'referral';
  if(/budget|too expensive|cost|price/.test(v))return 'objection_budget';
  if(/not a fit|doesn.?t fit|not relevant/.test(v))return 'objection_fit';
  if(/not now|later|next quarter|next year|timing/.test(v))return 'not_now';
  if(/no thank|not interested|decline/.test(v))return 'negative';
  return 'unknown';
}

export async function recordReply(store,id,{text,actor='NEO_MAIL'}={}){
  const item=await store.get(id);if(!item)throw new Error('outreach_not_found');
  if(!['delivered','replied'].includes(item.status))throw new Error('outreach_not_delivered');
  const classification=classifyReply(text);
  const nextAction=classification==='positive_interest'?'create_qualified_conversation':
    classification==='request_information'?'prepare_requested_materials':
    classification==='referral'?'enrich_referred_contact':
    classification==='objection_budget'?'prepare_value_or_scope_response':
    classification==='not_now'?'schedule_long_term_follow_up':
    classification==='unsubscribe'?'suppress_future_outreach':
    classification==='negative'?'close_or_recycle_lead':'executive_review_reply';
  return store.update(id,{
    status:'replied',
    replyClassification:classification,
    replySummary:clean(text,2000),
    nextAction
  },actor);
}
