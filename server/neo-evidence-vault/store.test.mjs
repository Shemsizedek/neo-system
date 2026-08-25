import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvidenceVault } from './store.mjs';

const temp=()=>`:memory:`;

test('ingests and reviews evidence with audit events',()=>{
  const vault=createEvidenceVault(temp());
  try{
    const created=vault.createEvidence({asset:'NOMNI',title:'Issuer agreement',sourceType:'AGREEMENT',sourceUrl:'https://example.test/agreement'},'analyst-1');
    assert.equal(created.asset,'NOMNI');
    assert.equal(created.reviewStatus,'UNREVIEWED');
    const reviewed=vault.reviewEvidence(created.id,{status:'ACCEPTED',reviewer:'reviewer-1',note:'Source reviewed'});
    assert.equal(reviewed.reviewStatus,'ACCEPTED');
    assert.equal(reviewed.reviewer,'reviewer-1');
    assert.equal(vault.listEvidence('NOMNI').length,1);
    const events=vault.listAudit('NOMNI');
    assert.equal(events.length,2);
    assert.equal(events[0].eventType,'evidence.reviewed');
    assert.equal(events[1].eventType,'evidence.ingested');
  }finally{vault.close();}
});

test('requires valid review state and reviewer',()=>{
  const vault=createEvidenceVault(temp());
  try{
    const created=vault.createEvidence({asset:'TEST',title:'Record',sourceType:'OTHER'},'analyst');
    assert.throws(()=>vault.reviewEvidence(created.id,{status:'UNREVIEWED',reviewer:'reviewer'}),/invalid_review_status/);
    assert.throws(()=>vault.reviewEvidence(created.id,{status:'ACCEPTED'}),/reviewer_required/);
  }finally{vault.close();}
});
