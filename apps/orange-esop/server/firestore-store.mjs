import { randomUUID } from 'node:crypto';

export function createFirestoreEsopStore({ db, now = () => new Date().toISOString(), id = () => randomUUID() } = {}) {
  if (!db?.collection) throw new Error('firestore_db_required');

  const participants = db.collection('orangeEsopParticipants');
  const stewardship = db.collection('orangeEsopStewardship');
  const reconciliation = db.collection('orangeEsopReconciliation');
  const certificates = db.collection('orangeEsopCertificates');
  const statements = db.collection('orangeEsopStatements');
  const audit = db.collection('orangeEsopAudit');

  function auditEntry(eventType, payload = {}) {
    const eventId=id();
    return { ref:audit.doc(eventId), value:{eventId,eventType,...payload,at:now()} };
  }

  async function atomicWrite(domainWrite, eventType, payload) {
    const event=auditEntry(eventType,payload);
    const batch=db.batch();
    domainWrite(batch);
    batch.create(event.ref,event.value);
    await batch.commit();
  }

  return {
    async summary() {
      const [pCount,sCount,rSnap,aCount]=await Promise.all([
        participants.count().get(),
        stewardship.count().get(),
        reconciliation.orderBy('at','desc').limit(1).get(),
        audit.count().get()
      ]);
      return {
        participantCount:pCount.data().count,
        stewardshipEntries:sCount.data().count,
        reconciliation:rSnap.empty?null:{reconciliationId:rSnap.docs[0].id,...rSnap.docs[0].data()},
        auditCount:aCount.data().count
      };
    },

    async snapshot() {
      const [pSnap,sSnap,rSnap,aSnap]=await Promise.all([
        participants.orderBy('updatedAt','desc').limit(500).get(),
        stewardship.orderBy('recordedAt','desc').limit(500).get(),
        reconciliation.orderBy('at','desc').limit(1).get(),
        audit.orderBy('at','desc').limit(500).get()
      ]);
      return {
        participants:Object.fromEntries(pSnap.docs.map(d=>[d.id,{participantId:d.id,...d.data()}])),
        stewardship:sSnap.docs.map(d=>({entryId:d.id,...d.data()})),
        reconciliation:rSnap.empty?null:{reconciliationId:rSnap.docs[0].id,...rSnap.docs[0].data()},
        audit:aSnap.docs.map(d=>({eventId:d.id,...d.data()}))
      };
    },

    async upsertParticipant(input) {
      const ref=participants.doc(input.participantId);
      const value={...input,updatedAt:now()};
      await atomicWrite(
        batch=>batch.set(ref,value,{merge:true}),
        'PARTICIPANT_UPSERTED',
        {participantId:input.participantId}
      );
      return {participantId:ref.id,...value};
    },

    async getParticipant(participantId) {
      const doc=await participants.doc(participantId).get();
      return doc.exists?{participantId:doc.id,...doc.data()}:null;
    },

    async listParticipants() {
      const snap=await participants.orderBy('updatedAt','desc').limit(500).get();
      return snap.docs.map(doc=>({participantId:doc.id,...doc.data()}));
    },

    async addStewardship(input) {
      const entryId=input.entryId || id();
      const ref=stewardship.doc(entryId);
      const value={...input,entryId,recordedAt:input.recordedAt||now()};
      await atomicWrite(
        batch=>batch.create(ref,value),
        'STEWARDSHIP_RECORDED',
        {participantId:input.participantId,entryId}
      );
      return value;
    },

    async saveReconciliation(run) {
      const reconciliationId=id();
      const ref=reconciliation.doc(reconciliationId);
      const value={...run,reconciliationId,at:run.at||now()};
      await atomicWrite(
        batch=>batch.create(ref,value),
        'RECONCILIATION_RUN',
        {reconciliationId,status:run.status}
      );
      return value;
    },

    async saveCertificate(certificate) {
      const ref=certificates.doc(certificate.certificateId);
      await atomicWrite(
        batch=>batch.create(ref,certificate),
        'CERTIFICATE_ISSUED',
        {participantId:certificate.participantId,certificateId:certificate.certificateId}
      );
      return certificate;
    },

    async saveStatement(statement) {
      const ref=statements.doc(statement.statementId);
      await atomicWrite(
        batch=>batch.create(ref,statement),
        'STATEMENT_GENERATED',
        {participantId:statement.participantId,statementId:statement.statementId}
      );
      return statement;
    }
  };
}
