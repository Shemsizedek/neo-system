import { buildOpportunity } from './core.mjs';
import { buildApprovalQueueItem, buildProposal, nextFollowUp } from './proposal.mjs';

const clean=(value,max=500)=>String(value??'').trim().slice(0,max);
const safeArray=(value,max=20)=>Array.isArray(value)?value.slice(0,max):[];
const validHttp=value=>{try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.toString():''}catch{return ''}};

export function normalizePublicProspect(input={}, provenance={}) {
  const sources=safeArray(provenance.sources || input.sources,12)
    .map(source=>({
      url:validHttp(source?.url||source),
      title:clean(source?.title,180),
      observedAt:clean(source?.observedAt||provenance.observedAt,60),
      sourceType:clean(source?.sourceType||'public_web',40),
    }))
    .filter(source=>source.url);

  if(!clean(input.organization||input.name,140)) throw new Error('prospect_identity_required');
  if(!sources.length) throw new Error('prospect_source_provenance_required');

  return {
    name:clean(input.name,100),
    organization:clean(input.organization||input.name,140),
    sector:clean(input.sector,80),
    geography:clean(input.geography,100),
    intent:clean(input.intent||input.publicNeedSignal,160),
    decisionAuthority:clean(input.decisionAuthority,80),
    decisionMakerName:clean(input.decisionMakerName,100),
    publicContactUrl:validHttp(input.publicContactUrl),
    budgetUsd:Number(input.budgetUsd)||0,
    timelineDays:Number(input.timelineDays)||365,
    needStrength:Number(input.needStrength)||5,
    productFit:Number(input.productFit)||5,
    engagement:Number(input.engagement)||0,
    complexity:Number(input.complexity)||5,
    publicSignals:safeArray(input.publicSignals,12).map(v=>clean(v,200)),
    sources,
  };
}

export function prospectFromCrawlerEnvelope(envelope, candidate) {
  if(!envelope?.provenanceRequired) throw new Error('crawler_provenance_envelope_required');
  const sourceMeta=envelope.sourceMeta||{};
  return normalizePublicProspect(candidate,{
    observedAt:envelope.createdAt||envelope.generatedAt,
    sources:safeArray(candidate?.sources,12).length ? candidate.sources : [{
      url:candidate?.sourceUrl,
      title:candidate?.sourceTitle,
      observedAt:envelope.createdAt||envelope.generatedAt,
      sourceType:sourceMeta.adapter||envelope.adapter||'neo-crawler',
    }],
  });
}

export function prepareProspect(candidate, options={}) {
  const normalized=normalizePublicProspect(candidate,{sources:candidate.sources});
  const opportunity=buildOpportunity(normalized);
  const proposal=buildProposal(opportunity,{
    title:options.title,
    executiveSummary:options.executiveSummary,
    outcomes:options.outcomes||deriveOutcomes(normalized,opportunity),
    modules:options.modules||[],
    assumptions:[
      'Scope is based on public information and requires discovery validation.',
      'Pricing is non-binding and subject to technical, security, legal and procurement diligence.',
      ...(options.assumptions||[])
    ],
  });
  const approvalQueueItem=buildApprovalQueueItem(opportunity,proposal);
  const followUp=nextFollowUp({
    stage:opportunity.stage==='approval_required'?'approval_required':'contacted',
    lastContactAt:options.asOf||new Date().toISOString(),
    engagement:normalized.engagement
  });
  return {
    normalized,
    opportunity,
    proposal,
    approvalQueueItem,
    followUp,
    provenance:{
      sourceCount:normalized.sources.length,
      sources:normalized.sources,
    },
  };
}

function deriveOutcomes(prospect, opportunity){
  const outcomes=[
    `Deploy a tailored NEO environment for ${prospect.organization}.`,
    'Reduce fragmented administrative and knowledge workflows through a unified operating layer.',
  ];
  if(opportunity.dealClass==='systems_architecture') outcomes.push('Design a client-specific architecture rather than a commodity software implementation.');
  if(opportunity.dealClass==='institutional_saas'||opportunity.dealClass==='sovereign_institutional') outcomes.push('Establish role-aware institutional workflows with governed automation and auditable records.');
  if(opportunity.dealClass==='equity_investment') return ['Present verified NEO System traction, architecture, commercial model and diligence materials through an approved investor-relations process.'];
  return outcomes;
}

export async function ingestPreparedProspect(prepared,{crmStore,actor='NIA-013 DEALDESK'}={}){
  if(!crmStore?.create) throw new Error('crm_store_required');
  const lead=await crmStore.create(prepared.opportunity.crmRecord,actor);
  let organization=null;
  if(prepared.normalized.organization){
    organization=await crmStore.create({
      type:'organization',
      name:prepared.normalized.organization,
      status:'active',
      owner:actor,
      description:`Prospect organization | ${prepared.normalized.sector||'sector unclassified'} | sourced from ${prepared.provenance.sourceCount} public source(s)`,
      endpoint:prepared.normalized.publicContactUrl,
      tags:['dealdesk','prospect',prepared.normalized.sector||'unclassified'].join(','),
    },actor);
  }
  let contact=null;
  if(prepared.normalized.decisionMakerName){
    contact=await crmStore.create({
      type:'contact',
      name:prepared.normalized.decisionMakerName,
      status:'active',
      owner:actor,
      description:`${prepared.normalized.decisionAuthority||'decision role unverified'} at ${prepared.normalized.organization}. Public-source prospect contact; verify before outreach.`,
      endpoint:prepared.normalized.publicContactUrl,
      tags:['dealdesk','public-source-contact'].join(','),
    },actor);
  }
  return {lead,organization,contact,approvalQueueItem:prepared.approvalQueueItem,proposal:prepared.proposal,provenance:prepared.provenance};
}

export function buildOutreachBrief(prepared={}){
  const p=prepared.normalized||{};
  const o=prepared.opportunity||{};
  return {
    channel:'public_business_contact_route',
    prospect:p.organization||p.name,
    decisionMaker:p.decisionMakerName||null,
    decisionRole:p.decisionAuthority||null,
    publicContactUrl:p.publicContactUrl||null,
    subject:`NEO System opportunity for ${p.organization||p.name}`,
    angle:o.dealClass==='equity_investment'
      ? 'investor_relations_diligence_intro'
      : `commercial_${o.dealClass}`,
    proofRequired:true,
    sourceUrls:(prepared.provenance?.sources||[]).map(s=>s.url),
    sendState:o.quote?.approvalRequired?'approval_required':'draft_ready',
    instructions:'Use only verified public facts. Do not invent pain points, personal email addresses, endorsements, budget, procurement authority or investment terms.',
  };
}
