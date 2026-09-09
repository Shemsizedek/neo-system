import test from 'node:test';
import assert from 'node:assert/strict';
import { handleGissRoute } from './giss-http-routes.mjs';
import { createInMemoryTempleRegistry, createTempleCitizenGISSService } from './temple-citizen-giss.mjs';

function fixture() {
  const enrollmentId = 'giss:citizen-24';
  const registry = createInMemoryTempleRegistry({
    credentials: [['neopass:24', { id: 'np-24', status: 'active', templeCitizenId: 'citizen-24' }]],
    citizens: [['citizen-24', { id: 'citizen-24', status: 'active' }]],
    bookOfLife: [['citizen-24', { id: 'bol-24', status: 'active' }]],
    degreeAssignments: [[enrollmentId, { id: 'degree-1', enrollmentId, templeDegree: 1, lesson: 'Christism & the Study of Sutekh', council: 'Council of Arius' }]],
    portfolios: [[enrollmentId, { id: 'portfolio-24', status: 'active' }]],
    advancements: [[enrollmentId, { status: 'not_submitted' }]]
  });
  return createTempleCitizenGISSService({ registry, now: () => '2026-09-09T00:00:00.000Z' });
}

async function call(pathname, method = 'GET', authenticated = true) {
  let response;
  const handled = await handleGissRoute({
    req: { method, headers: {} },
    res: {},
    url: { pathname },
    subjectResolver: () => authenticated ? 'neopass:24' : null,
    gissService: fixture(),
    json: (_res, status, body) => { response = { status, body }; }
  });
  return { handled, ...response };
}

test('requires NEOpass identity', async () => {
  const result = await call('/api/v1/temple/giss/eligibility', 'GET', false);
  assert.equal(result.status, 401);
  assert.equal(result.body.error, 'neopass_identity_required');
});

test('returns GISS eligibility', async () => {
  const result = await call('/api/v1/temple/giss/eligibility');
  assert.equal(result.status, 200);
  assert.equal(result.body.eligible, true);
  assert.equal(result.body.entitlement, 'giss.enroll');
});

test('POST enroll provisions the learner', async () => {
  const result = await call('/api/v1/temple/giss/enroll', 'POST');
  assert.equal(result.status, 200);
  assert.equal(result.body.enrollment.status, 'enrolled');
  assert.equal(result.body.degreeAssignment.templeDegree, 1);
});

test('dashboard exposes degree and LMS state', async () => {
  const result = await call('/api/v1/temple/giss/dashboard');
  assert.equal(result.status, 200);
  assert.equal(result.body.lms.dashboardState, 'assigned');
  assert.equal(result.body.degreeAssignment.council, 'Council of Arius');
});

test('portfolio and council are separately readable', async () => {
  const portfolio = await call('/api/v1/temple/giss/portfolio');
  const council = await call('/api/v1/temple/giss/council');
  assert.equal(portfolio.body.nousPortfolio.id, 'portfolio-24');
  assert.equal(council.body.councilAdvancement.status, 'not_submitted');
});
