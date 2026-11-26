// Managed Firestore adapter for the Temple/GISS registry.
// The caller supplies a Firestore-compatible db instance so credentials stay
// in the deployment identity/IAM layer rather than source control.

export function createFirestoreTempleRegistry({ db, now = () => new Date().toISOString() } = {}) {
  if (!db?.collection) throw new Error('firestore_db_required');

  const collections = {
    neopassCredentials: 'templeNeopassCredentials',
    templeCitizens: 'templeCitizens',
    bookOfLifeRecords: 'templeBookOfLife',
    gissEnrollments: 'gissEnrollments',
    degreeAssignments: 'templeDegreeAssignments',
    nousPortfolios: 'templeNousPortfolios',
    councilAdvancements: 'templeCouncilAdvancements'
  };

  async function firstWhere(collection, field, value) {
    const snap = await db.collection(collection).where(field, '==', value).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async function getById(collection, id) {
    const doc = await db.collection(collection).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  return {
    async init() { return this; },
    async getNEOpassCredential(subject) {
      return firstWhere(collections.neopassCredentials, 'subject', subject);
    },
    /**
     * Atomic self-service Nous consent change. A previously looked-up document
     * is re-read within the transaction to avoid stale status or cutoff grants.
     */
    async setNEOpassNousAccess(subject, { enabled, sessionIssuedAt, nowEpochSeconds } = {}) {
      if (typeof subject !== 'string' || !subject ||
          typeof enabled !== 'boolean' ||
          !Number.isSafeInteger(sessionIssuedAt) ||
          !Number.isSafeInteger(nowEpochSeconds) ||
          sessionIssuedAt > nowEpochSeconds + 30 ||
          nowEpochSeconds - sessionIssuedAt > 300) throw new Error('nous_consent_invalid_input');
      const found = await firstWhere(collections.neopassCredentials, 'subject', subject);
      if (!found?.id || found.subject !== subject) {
        const error = new Error('nous_credential_not_found'); error.code = error.message; throw error;
      }
      const ref = db.collection(collections.neopassCredentials).doc(found.id);
      if (typeof db.runTransaction !== 'function') throw new Error('nous_transaction_required');
      return db.runTransaction(async tx => {
        const snapshot = await tx.get(ref);
        const record = snapshot.exists ? snapshot.data() : null;
        if (!record || record.subject !== subject) {
          const error = new Error('nous_credential_not_found'); error.code = error.message; throw error;
        }
        if (record.status !== 'active' || record.disabled === true || record.suspended === true) {
          const error = new Error('nous_member_not_active'); error.code = error.message; throw error;
        }
        const cutoff = record.sessionRevokedAfter;
        if (cutoff !== undefined && cutoff !== null &&
            (!Number.isSafeInteger(cutoff) || sessionIssuedAt <= cutoff)) {
          const error = new Error('neopass_session_revoked'); error.code = error.message; throw error;
        }
        const next = enabled ? {
          nousAccessEnabled: true,
          nousAccessExpiresAt: new Date((nowEpochSeconds + 24 * 3600) * 1000).toISOString(),
          nousConsentUpdatedAt: new Date(nowEpochSeconds * 1000).toISOString(),
        } : {
          nousAccessEnabled: false,
          nousAccessExpiresAt: null,
          sessionRevokedAfter: Math.max(Number.isSafeInteger(cutoff) ? cutoff : 0, nowEpochSeconds),
          nousConsentUpdatedAt: new Date(nowEpochSeconds * 1000).toISOString(),
        };
        tx.set(ref, next, { merge: true });
        return next;
      });
    },
    async getNEOpassCredentialByLogin(login) {
      const value = String(login || '').trim().toLowerCase();
      return await firstWhere(collections.neopassCredentials, 'usernameKey', value)
        || await firstWhere(collections.neopassCredentials, 'emailKey', value);
    },
    async getTempleCitizen(id) {
      return getById(collections.templeCitizens, id);
    },
    async getBookOfLifeRecord(templeCitizenId) {
      return firstWhere(collections.bookOfLifeRecords, 'templeCitizenId', templeCitizenId);
    },
    async getGISSEnrollment(templeCitizenId) {
      return firstWhere(collections.gissEnrollments, 'templeCitizenId', templeCitizenId);
    },
    async createGISSEnrollment(record) {
      // Stable citizen-scoped document IDs make retries idempotent. A caller may
      // still provide an explicit ID for migrations/imports.
      const id = record.id || `giss:${record.templeCitizenId}`;
      const ref = db.collection(collections.gissEnrollments).doc(id);
      const existing = await ref.get();
      if (existing.exists) return { id: ref.id, ...existing.data() };
      const value = { ...record, createdAt: record.createdAt || now(), updatedAt: now() };
      await ref.set(value, { merge: false });
      return { id: ref.id, ...value };
    },
    async getTempleDegreeAssignment(enrollmentId) {
      return firstWhere(collections.degreeAssignments, 'enrollmentId', enrollmentId);
    },
    async getNousPortfolio(enrollmentId) {
      return firstWhere(collections.nousPortfolios, 'enrollmentId', enrollmentId);
    },
    async getCouncilAdvancement(enrollmentId) {
      return firstWhere(collections.councilAdvancements, 'enrollmentId', enrollmentId);
    },
    async upsert(collectionKey, record, key = 'id') {
      const collection = collections[collectionKey];
      if (!collection) throw new Error('unsupported_registry_collection');
      let ref;
      if (key === 'id' && record.id) {
        ref = db.collection(collection).doc(record.id);
      } else {
        const existing = await firstWhere(collection, key, record[key]);
        ref = existing ? db.collection(collection).doc(existing.id) : db.collection(collection).doc();
      }
      const value = { ...record, updatedAt: now() };
      await ref.set(value, { merge: true });
      return { id: ref.id, ...value };
    }
  };
}
