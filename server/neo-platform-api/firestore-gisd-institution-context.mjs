// CSC-GISS-010: durable, fail-closed institution membership context loader.
// This adapter is intentionally not connected to the production server until
// membership provisioning and institutional authority are independently approved.
export function createFirestoreInstitutionContextLoader({ db } = {}) {
  if (typeof db?.collection !== 'function') throw new Error('firestore_db_required');
  const institutions = db.collection('gisdInstitutions');
  const memberships = db.collection('gisdInstitutionMemberships');
  const reports = db.collection('gisdInstitutionReports');
  return async function loadInstitutionContext({ subject, institutionId } = {}) {
    if (typeof subject !== 'string' || !subject || typeof institutionId !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(institutionId)) return null;
    const institutionDoc = await institutions.doc(institutionId).get();
    if (!institutionDoc.exists || institutionDoc.data()?.status !== 'active') return null;
    // Query by subject and institution. Never trust a client-supplied role.
    const memberDocs = await memberships.where('subjectId','==',subject).where('institutionId','==',institutionId).limit(20).get();
    const memberRows = memberDocs.docs.map(doc=>doc.data()).filter(m=>m.active===true && m.subjectId===subject && m.institutionId===institutionId);
    if (!memberRows.length) return null;
    const reportDocs = await reports.where('institutionId','==',institutionId).where('visibility','==','institution').limit(100).get();
    return {
      actor: {subjectId:subject,memberships:memberRows.map(({institutionId,role,active})=>({institutionId,role,active}))},
      institution: {id:institutionId,name:institutionDoc.data()?.name || institutionId},
      reporting: reportDocs.docs.map(doc=>({id:doc.id,...doc.data()})).filter(r=>r.institutionId===institutionId && r.visibility==='institution')
    };
  };
}
