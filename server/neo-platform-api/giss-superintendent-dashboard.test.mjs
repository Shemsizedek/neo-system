import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuperintendentDashboardView } from './giss-superintendent-dashboard.mjs';

const actor = { subjectId: 'admin-a', memberships: [{ institutionId: 'temple-a', role: 'institution_admin', active: true }] };
const institution = { id: 'temple-a', name: 'Temple A' };

test('authorized admin sees organization and own institution reports', () => {
  const view = createSuperintendentDashboardView({actor,institutionId:'temple-a',institution,reporting:[
    {id:'r1',institutionId:'temple-a',visibility:'institution',title:'Attendance',status:'draft'},
    {id:'r2',institutionId:'temple-b',visibility:'institution',title:'Other report',status:'draft'},
    {id:'r3',institutionId:'temple-a',visibility:'private',title:'Restricted',status:'draft'}
  ]});
  assert.equal(view.allowed,true);
  assert.equal(view.superintendent.position,1);
  assert.deepEqual(view.reports.map(x=>x.id),['r1']);
});
test('cross-institution dashboard access denied', () => {
  assert.equal(createSuperintendentDashboardView({actor,institutionId:'temple-b',institution:{id:'temple-b'}}).allowed,false);
});
test('mismatched institution record denied', () => {
  assert.equal(createSuperintendentDashboardView({actor,institutionId:'temple-a',institution:{id:'temple-b'}}).allowed,false);
});
test('no membership denies access', () => {
  assert.equal(createSuperintendentDashboardView({actor:{subjectId:'guest'},institutionId:'temple-a',institution}).allowed,false);
});
