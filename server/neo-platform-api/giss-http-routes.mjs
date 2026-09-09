import { TempleCitizenGISSError } from './temple-citizen-giss.mjs';

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(payload), 'cache-control': 'no-store' });
  res.end(payload);
}

export function createGissHttpHandler({ service = null, subjectResolver, now = () => new Date().toISOString() } = {}) {
  if (!subjectResolver) throw new Error('subject_resolver_required');

  return async function handleGissRoute(req, res, url = new URL(req.url || '/', 'http://neo.local')) {
    const route = url.pathname;
    const recognized = route === '/api/v1/temple/citizen' || route === '/api/v1/temple/giss/eligibility' || route === '/api/v1/temple/giss/enroll' || route === '/api/v1/temple/giss/dashboard' || route === '/api/v1/temple/giss/portfolio' || route === '/api/v1/temple/giss/council';
    if (!recognized) return false;
    if (!service) { json(res, 503, { error: 'giss_registry_not_configured', message: 'Temple GISS requires a configured durable registry.', readOnly: true }); return true; }
    const subject = subjectResolver(req);
    if (!subject) { json(res, 401, { error: 'neopass_identity_required', readOnly: true }); return true; }
    try {
      if (route === '/api/v1/temple/giss/enroll') {
        if (req.method !== 'POST') { json(res, 405, { error: 'method_not_allowed' }); return true; }
        json(res, 200, { apiVersion: 'v1', subject, ...(await service.provisionEnrollment(subject)) }); return true;
      }
      if (req.method !== 'GET') { json(res, 405, { error: 'method_not_allowed' }); return true; }
      if (route === '/api/v1/temple/giss/eligibility') { json(res, 200, { apiVersion: 'v1', subject, ...(await service.eligibility(subject)) }); return true; }
      const state = await service.readState(subject);
      if (route === '/api/v1/temple/citizen') { json(res, 200, { apiVersion: 'v1', subject, templeCitizen: state.templeCitizen, bookOfLife: state.bookOfLife, enrollment: state.enrollment ? { id: state.enrollment.id, status: state.enrollment.status } : null, timestamp: now() }); return true; }
      if (route === '/api/v1/temple/giss/dashboard') { json(res, 200, { apiVersion: 'v1', subject, enrollment: state.enrollment, degreeAssignment: state.degreeAssignment, lms: state.lms, timestamp: now() }); return true; }
      if (route === '/api/v1/temple/giss/portfolio') { json(res, 200, { apiVersion: 'v1', subject, enrollmentId: state.enrollment?.id || null, nousPortfolio: state.lms.nousPortfolio, timestamp: now() }); return true; }
      json(res, 200, { apiVersion: 'v1', subject, enrollmentId: state.enrollment?.id || null, councilAdvancement: state.lms.councilAdvancement, timestamp: now(), readOnly: true }); return true;
    } catch (error) {
      if (error instanceof TempleCitizenGISSError) { json(res, error.status, { error: error.code, message: error.message, readOnly: true }); return true; }
      throw error;
    }
  };
}
