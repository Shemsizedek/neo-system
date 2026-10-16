import { prepareProspect, buildOutreachBrief } from './prospect-pipeline.mjs';
import { renderDealDeskDashboard } from './dashboard.mjs';
import { composeOutreach } from './outbound.mjs';

export const WAVE1_PROSPECTS = Object.freeze([
  {
    id:'prospect-edot-001',
    organization:'Episcopal Diocese of Texas',
    sector:'religious network',
    geography:'Texas, USA',
    intent:'white-label member, records, education and governance operating environment',
    decisionAuthority:'Director of Information Technology',
    decisionMakerName:'Nina Gaspar',
    publicContactUrl:'https://www.epicenter.org/about/the-diocese/staff-directory/',
    needStrength:8,
    productFit:9,
    engagement:2,
    complexity:5,
    sources:[{
      url:'https://www.epicenter.org/about/the-diocese/staff-directory/',
      title:'Episcopal Diocese of Texas Staff Directory',
      sourceType:'public_organization_site'
    }]
  },
  {
    id:'prospect-weil-001',
    organization:'Weil, Gotshal & Manges LLP',
    sector:'law firm',
    geography:'Global / Dallas contact',
    intent:'custom enterprise AI operating system and workflow architecture',
    decisionAuthority:'Chief AI & Innovation Officer',
    decisionMakerName:'Andrew Simon',
    publicContactUrl:'https://www.weil.com/people/andrew-simon',
    needStrength:8,
    productFit:9,
    engagement:2,
    complexity:7,
    sources:[{
      url:'https://www.weil.com/people/andrew-simon',
      title:'Andrew Simon — Chief AI & Innovation Officer',
      sourceType:'public_organization_site'
    }]
  }
]);

function seedRecords(prepared){
  const p=prepared.normalized,o=prepared.opportunity;
  const base=[
    {
      type:'lead',
      slug:`dealdesk-${p.organization.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`,
      name:p.organization,
      status:'active',
      owner:'NIA-013 DEALDESK',
      description:`${o.dealClass} | score ${o.qualification.score}/100 | ask ${o.quote.ask ?? 'terms gated'} | stage ${o.stage}`,
      endpoint:p.publicContactUrl,
      tags:['dealdesk','wave-1',o.dealClass,`grade-${o.qualification.grade.toLowerCase()}`].join(',')
    },
    {
      type:'organization',
      slug:`dealdesk-org-${p.organization.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`,
      name:p.organization,
      status:'active',
      owner:'NIA-013 DEALDESK',
      description:`Wave 1 sourced prospect | ${p.sector} | ${prepared.provenance.sourceCount} public source(s)`,
      endpoint:p.publicContactUrl,
      tags:['dealdesk','wave-1','prospect'].join(',')
    }
  ];
  if(p.decisionMakerName)base.push({
    type:'contact',
    slug:`dealdesk-contact-${p.decisionMakerName.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')}`,
    name:p.decisionMakerName,
    status:'active',
    owner:'NIA-013 DEALDESK',
    description:`${p.decisionAuthority} at ${p.organization}. Public-source business contact; verify before outreach.`,
    endpoint:p.publicContactUrl,
    tags:['dealdesk','wave-1','public-source-contact'].join(',')
  });
  return base;
}

export function createDealDeskRuntime({crmStore,outreachStore=null,now=()=>new Date().toISOString()}={}){
  const prepared=()=>WAVE1_PROSPECTS.map(prospect=>prepareProspect(prospect,{asOf:now()}));

  async function ensureWave1Crm(){
    if(!crmStore?.ensureSeed)throw new Error('crm_store_required');
    const deals=prepared();
    const records=deals.flatMap(seedRecords);
    await crmStore.ensureSeed(records);
    return {seeded:records.length,prospects:deals.length};
  }

  async function ensureWave1Outreach(){
    if(!outreachStore?.ensureSeed)return {seeded:0,prospects:0,available:false};
    const deals=prepared();
    const items=deals.map((deal,index)=>composeOutreach(deal,{prospectId:WAVE1_PROSPECTS[index]?.id||deal.normalized?.organization}));
    await outreachStore.ensureSeed(items);
    return {seeded:items.length,prospects:deals.length,available:true};
  }

  async function snapshot(){
    const deals=prepared();
    const approvalQueue=deals.map(x=>x.approvalQueueItem).filter(Boolean);
    const outreachQueue=outreachStore?.list ? await outreachStore.list() : [];
    return {
      campaign:'NEO-DEALDESK-004',
      wave:1,
      liveSendEnabled:false,
      prospects:deals,
      outreach:deals.map(buildOutreachBrief),
      approvalQueue,
      outreachQueue,
      outboundExecution:{providerBoundary:'NEO_MAIL',liveNetworkSend:false,approvalRequired:true},
      asOf:now()
    };
  }

  async function dashboardHtml(){
    const data=await snapshot();
    return renderDealDeskDashboard({opportunities:data.prospects,approvalQueue:data.approvalQueue,outreachQueue:data.outreachQueue,asOf:data.asOf});
  }

  return Object.freeze({ensureWave1Crm,ensureWave1Outreach,snapshot,dashboardHtml});
}
