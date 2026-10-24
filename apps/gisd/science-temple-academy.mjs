// Proposed Science Temple academy projection; no PII, enrollment writes or financial transactions.
import registry from '../../data/institutions/science-temple.json' with { type: 'json' };

export const SCIENCE_TEMPLE_ROLES = Object.freeze(['student','guardian','faculty','registrar','principal','gisd_admin']);
export const SCIENCE_TEMPLE_BANDS = Object.freeze(['True Light Elementary','Nun Middle','Noone High']);

export function academyCatalog() {
  return Object.freeze({ id: registry.id, name: registry.name, tagline: registry.tagline,
    status: registry.status, bands: SCIENCE_TEMPLE_BANDS, universityPathway: 'Nu University Texas (planned)',
    programs: ['12 Core 101s','Noology','STEM','History & Ourstory','Leadership'],
    enrollmentStatus: 'not_open', accreditation: 'not_verified' });
}

export function projectTuition({ students, annualTuition, aidRate = 0.2 } = {}) {
  if (![students,annualTuition,aidRate].every(Number.isFinite) || students < 0 || !Number.isInteger(students) || annualTuition < 0 || aidRate < 0 || aidRate > 1) throw new RangeError('invalid_financial_assumptions');
  const gross = students * annualTuition;
  return Object.freeze({ grossTuition: gross, modeledAid: gross * aidRate, modeledNetTuition: gross * (1-aidRate), currency: 'USD', status: 'planning_only_unverified' });
}

export function fiveYearPlanningCase() {
  return registry.financial_assumptions.students.map((students, index) => Object.freeze({ year: index + 1, students, ...projectTuition({ students, annualTuition: registry.financial_assumptions.tuition[index], aidRate: registry.financial_assumptions.discount_rate }) }));
}

export function academyDashboard({ role, authenticated = false, authorized = false } = {}) {
  if (!authenticated || !authorized || !SCIENCE_TEMPLE_ROLES.includes(role)) throw Object.assign(new Error('academy_access_denied'), { status: 403 });
  return Object.freeze({ academy: academyCatalog(), role, modules: role === 'student' ? ['courses','assignments','attendance','portfolio'] : role === 'guardian' ? ['dependent_progress','communications'] : role === 'faculty' ? ['classes','assessments'] : role === 'registrar' ? ['admissions','records'] : role === 'principal' ? ['academics','staffing','safety'] : ['institutional_planning','compliance'], readOnly: true, syntheticDataOnly: true });
}
