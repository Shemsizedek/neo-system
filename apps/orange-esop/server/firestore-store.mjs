import { randomUUID } from 'node:crypto';

export function createFirestoreEsopStore({ db, now = () => new Date().toISOString(), id = () => randomUUID() } = {}) {
  if (!db?.collection) throw new Error('firestore_db_required');

  const participants = db.collection('orangeEsopParticipants');
  const stewardship = db.collection('orangeEsopStewardship');
  const reconciliation = db.collection('orangeEsopReconciliation');
  const certificates = db.collection('orangeEsopCertificates');
  const statements = db.collection('orangeEsopStatements');
  const audit = db.collection('orangeEsopAudit');

  async function auditWrite(eventType, payload = {}) {
    const eventId = id();
    await audit.doc(eventId).set({ eventId, eventType, ...payload, at: now() }, { merge: false });
  }

  return {
    async snapshot() {
      const [pSnap, sSnap, rSnap, aSnap] = await Promise.all([
        participants.limit(500).get(),
        stewardship.limit(5000).get(),
        reconciliation.orderBy('at', 'desc').limit(1).get(),
        audit.orderBy('at', 'desc').limit(5000).get()
      ]);
      return {
        participants: Object.fromEntries(pSnap.docs.map(d => [d.id, { participantId:d.id, ...d.data() }])),
        stewardship: sSnap.docs.map(d => ({ entryId:d.id, ...d.data() })),
        reconciliation: rSnap.empty ? null : { reconciliationId:rSnap.docs[0].id, ...rSnap.docs[0].data() },
        audit: aSnap.docs.map(d => ({ eventId:d.id, ...d.data() }))
      };
    },

    async upsertParticipant(input) {
      const ref = participants.doc(input.participantId);
      const value = { ...input, updatedAt: now() };
      await ref.set(value, { merge: true });
      await auditWrite('PARTICIPANT_UPSERTED', { participantId: input.participantId });
      return { participantId: ref.id, ...value };
    },

    async getParticipant(participantId) {
      const doc = await participants.doc(participantId).get();
      return doc.exists ? { participantId:doc.id, ...doc.data() } : null;
    },

    async listParticipants() {
      const snap = await participants.orderBy('updatedAt', 'desc').limit(500).get();
      return snap.docs.map(doc => ({ participantId:doc.id, ...doc.data() }));
    },

    async addStewardship(input) {
      const entryId = input.entryId || id();
      const value = { ...input, recordedAt: input.recordedAt || now() };
      await stewardship.doc(entryId).set(value, { merge:false });
      await auditWrite('STEWARDSHIP_RECORDED', { participantId: input.participantId, entryId });
      return { entryId, ...value };
    },

    async saveReconciliation(run) {
      const reconciliationId = id();
      const value = { ...run, at: run.at || now() };
      await reconciliation.doc(reconciliationId).set(value, { merge:false });
      await auditWrite('RECONCILIATION_RUN', { reconciliationId, status: run.status });
      return { reconciliationId, ...value };
    },

    async saveCertificate(certificate) {
      await certificates.doc(certificate.certificateId).set(certificate, { merge:false });
      await auditWrite('CERTIFICATE_ISSUED', { participantId: certificate.participantId, certificateId: certificate.certificateId });
      return certificate;
    },

    async saveStatement(statement) {
      await statements.doc(statement.statementId).set(statement, { merge:false });
      await auditWrite('STATEMENT_GENERATED', { participantId: statement.participantId, statementId: statement.statementId });
      return statement;
    }
  };
}
