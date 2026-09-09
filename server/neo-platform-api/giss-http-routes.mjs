import { TempleCitizenGISSError } from './temple-citizen-giss.mjs';

export async function handleGissRoute({ req, res, url, subjectResolver, gissService, json }) {
  const routes = new Set([
    '/api/v1/temple/citizen',
    '/api/v1/temple/giss/eligibility',
    '/api/v1/temple/giss/enroll',
    '/api/v1/temple/giss/dashboard',
    '/api/v1/temple/giss/portfolio',
    '/api/v1/temple/giss/council'
  ]);
  if (!routes.has(url.pathname)) return false;

  const subject = subjectResolver(req);
  if (!subject) {
    json(res, 401, { error: 'neopass_identity_required', readOnly: true });
    return true;
  }

  try {
    if (url.pathname === '/api/v1/temple/giss/enroll') {
      if (req.method !== 'POST') {
        json(res, 405, { error: 'method_not_allowed', readOnly: true });
        return true;
      }
      const state = await gissService.provisionEnrollment(subject);
      json(res, 200, { apiVersion: 'v1', subject, provisioned: true, ...state });
      return true;
    }

    if (req.method !== 'GET') {
      json(res, 405, { error: 'method_not_allowed', readOnly: true });
      return true;
    }

    if (url.pathname === '/api/v1/temple/giss/eligibility') {
      json(res, 200, { apiVersion: 'v1', subject, readOnly: true, ...await gissService.eligibility(subject) });
      return true;
    }

    const state = await gissService.provisionEnrollment(subject);
    if (url.pathname === '/api/v1/temple/citizen') {
      json(res, 200, { apiVersion: 'v1', subject, readOnly: true, templeCitizen: state.templeCitizen, bookOfLife: state.bookOfLife, enrollment: state.enrollment });
    } else if (url.pathname === '/api/v1/temple/giss/dashboard') {
      json(res, 200, { apiVersion: 'v1', subject, readOnly: true, enrollment: state.enrollment, degreeAssignment: state.degreeAssignment, lms: state.lms });
    } else if (url.pathname === '/api/v1/temple/giss/portfolio') {
      json(res, 200, { apiVersion: 'v1', subject, readOnly: true, enrollmentId: state.enrollment.id, nousPortfolio: state.lms.nousPortfolio });
    } else {
      json(res, 200, { apiVersion: 'v1', subject, readOnly: true, enrollmentId: state.enrollment.id, councilAdvancement: state.lms.councilAdvancement });
    }
    return true;
  } catch (error) {
    if (error instanceof TempleCitizenGISSError) {
      json(res, error.status, { error: error.code, message: error.message, readOnly: true });
      return true;
    }
    throw error;
  }
}
