import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryCrmStore } from '../neo-platform-api/crm-store.mjs';
import { buildOutreachBrief, ingestPreparedProspect, normalizePublicProspect, prepareProspect, prospectFromCrawlerEnvelope } from './prospect-pipeline.mjs';

const source={url:'https://example.org/about',title:'Example public organization page',observedAt:'2026-09-23T12:00:00Z'};

test('public prospect requires provenance',()=>{
  assert.throws(()=>normalizePublicProspect({organization:'Example Org'}),/provenance/);
});

test('crawler envelope preserves provenance into a prospect',()=>{
  const p=prospectFromCrawlerEnvelope({
    provenanceRequired:true,
    adapter:'public-source',
    generatedAt:'2026-09-23T12:00:00Z'
  },{
    organization:'Example University',
    sector:'university',
    sourceUrl:'https://example.edu/technology',
    sourceTitle:'Technology strategy'
  });
  assert.equal(p.organization,'Example University');
  assert.equal(p.sources.length,1);
});

test('prepared commercial prospect creates proposal and CRM records',async()=>{
  const prepared=prepareProspect({
    organization:'Example University',
    sector:'university',
    geography:'Texas',
    intent:'AI modernization',
    decisionAuthority:'CIO',
    decisionMakerName:'Public Executive',
    publicContactUrl:'https://example.edu/contact',
    budgetUsd:1000000,
    timelineDays:90,
    needStrength:8,
    productFit:9,
    engagement:2,
    sources:[source]
  },{modules:['NEOsync','NEO Cipher']});
  assert.equal(prepared.opportunity.dealClass,'institutional_saas');
  assert.equal(prepared.proposal.kind,'non_binding_proposal');
  const store=createInMemoryCrmStore();
  const saved=await ingestPreparedProspect(prepared,{crmStore:store});
  assert.equal(saved.lead.type,'lead');
  assert.equal(saved.organization.type,'organization');
  assert.equal(saved.contact.type,'contact');
});

test('investor outreach stays in approval-required state',()=>{
  const prepared=prepareProspect({
    organization:'Example Capital',
    sector:'investment firm',
    intent:'seed investment',
    decisionAuthority:'Partner',
    publicContactUrl:'https://example.vc/contact',
    budgetUsd:3000000,
    productFit:9,
    needStrength:7,
    sources:[source]
  });
  const brief=buildOutreachBrief(prepared);
  assert.equal(brief.sendState,'approval_required');
  assert.equal(brief.angle,'investor_relations_diligence_intro');
});
