import test from 'node:test';
import assert from 'node:assert/strict';
import { createInMemoryTempleRegistry, createTempleCitizenGISSService } from './temple-citizen-giss.mjs';

function fixture() {
  const enrollmentId = 'giss:citizen-24';
  return createInMemoryTempleRegistry({
    credentials: [['neopass:24', { id: 'np-24', status: 'active', templeCitizenId: 'citizen-24' }]],
    citizens: [['citizen-24', { id: 'citizen-24', status: 'active' }]],
    bookOfLife: [['citizen-24', { id: 'bol-24', status: 'active' }]],
    degreeAssignments: [[enrollmentId, { id: 'degree-1', enrollmentId, templeDegree: 1, lesson: 'Christism & the Study of Sutekh', council: 'Council of Arius' }]],
    portfolios: [[enrollmentId, { id: 'portfolio-24', status: 'active' }]],
    advancements: [[enrollmentId, { status: 'not_submitted' }]]
  });
}

test('active NEOpass + Temple Citizen + Book of Life grants GISS eligibility', async () => {
  const service = createTempleCitizenGISSService({ registry: fixture(), now: () => '2026-09-09T00:00:00.000Z' });
  const result = await service.eligibility('neopass:24');
  assert.equal(result.eligible, true);
  assert.equal(result.entitlement, 'giss.enroll');
  assert.equal(result.enrollment.status, 'eligible');
});

test('provisions enrollment and returns assigned LMS degree state', async () => {
  const service = createTempleCitizenGISSService({ registry: fixture(), now: () => '2026-09-09T00:00:00.000Z' });
  const result = await service.provisionEnrollment('neopass:24');
  assert.equal(result.enrollment.status, 'enrolled');
  assert.equal(result.degreeAssignment.templeDegree, 1);
  assert.equal(result.lms.dashboardState, 'assigned');
  assert.equal(result.degreeAssignment.council, 'Council of Arius');
});

test('rejects a subject without NEOpass', async () => {
  const service = createTempleCitizenGISSService({ registry: fixture() });
  await assert.rejects(() => service.eligibility('unknown'), error => error.code === 'active_neopass_required' && error.status === 403);
});

test('rejects GISS eligibility when Book of Life record is not active', async () => {
  const registry = fixture();
  registry.state.bookOfLife.set('citizen-24', { id: 'bol-24', status: 'pending' });
  const service = createTempleCitizenGISSService({ registry });
  await assert.rejects(() => service.eligibility('neopass:24'), error => error.code === 'book_of_life_record_required' && error.status === 403);
});
