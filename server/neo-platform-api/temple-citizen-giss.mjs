export class TempleCitizenGISSError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export const TEMPLE_CITIZEN_STATUS = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive' });
export const BOOK_OF_LIFE_STATUS = Object.freeze({ ACTIVE: 'active', PENDING: 'pending', SUSPENDED: 'suspended', REVOKED: 'revoked' });
export const GISS_ENROLLMENT_STATUS = Object.freeze({ ELIGIBLE: 'eligible', ENROLLED: 'enrolled', PAUSED: 'paused', COMPLETED: 'completed' });

export function createTempleCitizenGISSService({ registry, now = () => new Date().toISOString() } = {}) {
  if (!registry) throw new Error('temple_registry_required');

  async function resolve(subject) {
    if (!subject) throw new TempleCitizenGISSError('neopass_identity_required', 'NEOpass identity is required.', 401);

    const credential = await registry.getNEOpassCredential(subject);
    if (!credential || credential.status !== 'active') {
      throw new TempleCitizenGISSError('active_neopass_required', 'An active NEOpass credential is required.', 403);
    }

    const citizen = await registry.getTempleCitizen(credential.templeCitizenId);
    if (!citizen || citizen.status !== TEMPLE_CITIZEN_STATUS.ACTIVE) {
      throw new TempleCitizenGISSError('temple_citizen_required', 'Active Temple Citizen status is required.', 403);
    }

    const bookOfLife = await registry.getBookOfLifeRecord(citizen.id);
    if (!bookOfLife || bookOfLife.status !== BOOK_OF_LIFE_STATUS.ACTIVE) {
      throw new TempleCitizenGISSError('book_of_life_record_required', 'An active Book of Life record is required for GISS eligibility.', 403);
    }

    return { credential, citizen, bookOfLife };
  }

  return {
    async eligibility(subject) {
      const identity = await resolve(subject);
      const enrollment = await registry.getGISSEnrollment(identity.citizen.id);
      return {
        eligible: true,
        entitlement: 'giss.enroll',
        templeCitizenId: identity.citizen.id,
        bookOfLifeRecordId: identity.bookOfLife.id,
        neopassCredentialId: identity.credential.id,
        enrollment: enrollment || { status: GISS_ENROLLMENT_STATUS.ELIGIBLE },
        timestamp: now()
      };
    },

    async provisionEnrollment(subject) {
      const identity = await resolve(subject);
      let enrollment = await registry.getGISSEnrollment(identity.citizen.id);
      if (!enrollment) {
        enrollment = await registry.createGISSEnrollment({
          templeCitizenId: identity.citizen.id,
          status: GISS_ENROLLMENT_STATUS.ENROLLED,
          entitlement: 'giss.enroll',
          createdAt: now()
        });
      }
      const degreeAssignment = await registry.getTempleDegreeAssignment(enrollment.id);
      return {
        templeCitizen: identity.citizen,
        bookOfLife: identity.bookOfLife,
        enrollment,
        degreeAssignment: degreeAssignment || null,
        lms: {
          dashboardState: degreeAssignment ? 'assigned' : 'awaiting_degree_assignment',
          lessons: [],
          assignments: [],
          nousPortfolio: await registry.getNousPortfolio(enrollment.id),
          councilAdvancement: await registry.getCouncilAdvancement(enrollment.id)
        },
        timestamp: now()
      };
    }
  };
}

export function createInMemoryTempleRegistry(seed = {}) {
  const state = {
    credentials: new Map(seed.credentials || []),
    citizens: new Map(seed.citizens || []),
    bookOfLife: new Map(seed.bookOfLife || []),
    enrollments: new Map(seed.enrollments || []),
    degreeAssignments: new Map(seed.degreeAssignments || []),
    portfolios: new Map(seed.portfolios || []),
    advancements: new Map(seed.advancements || [])
  };
  return {
    getNEOpassCredential: subject => state.credentials.get(subject) || null,
    getTempleCitizen: id => state.citizens.get(id) || null,
    getBookOfLifeRecord: citizenId => state.bookOfLife.get(citizenId) || null,
    getGISSEnrollment: citizenId => state.enrollments.get(citizenId) || null,
    async createGISSEnrollment(input) {
      const enrollment = { id: `giss:${input.templeCitizenId}`, ...input };
      state.enrollments.set(input.templeCitizenId, enrollment);
      return enrollment;
    },
    getTempleDegreeAssignment: enrollmentId => state.degreeAssignments.get(enrollmentId) || null,
    getNousPortfolio: enrollmentId => state.portfolios.get(enrollmentId) || null,
    getCouncilAdvancement: enrollmentId => state.advancements.get(enrollmentId) || null,
    state
  };
}
