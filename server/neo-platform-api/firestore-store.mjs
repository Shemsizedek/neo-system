// Shared Firestore persistence boundary for NEO service runtimes.
// The runtime injects an authenticated Firestore-compatible db instance so
// credentials remain in IAM/runtime identity instead of source control.

function requireDb(db) {
  if (!db?.collection) throw new Error('firestore_db_required');
  return db;
}

function requireName(value, field) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${field}_required`);
  return value.trim();
}

export function createNeoFirestoreStore({ db, namespace = 'neo', now = () => new Date().toISOString() } = {}) {
  requireDb(db);
  const root = requireName(namespace, 'namespace');

  function documentRef(collectionName, documentId) {
    const collection = requireName(collectionName, 'collection');
    const id = requireName(documentId, 'document_id');
    return db.collection(`${root}_${collection}`).doc(id);
  }

  return Object.freeze({
    namespace: root,

    async get(collectionName, documentId) {
      const snap = await documentRef(collectionName, documentId).get();
      if (!snap?.exists) return null;
      return { id: snap.id ?? documentId, ...snap.data() };
    },

    async set(collectionName, documentId, value, { merge = true } = {}) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('document_value_required');
      const ref = documentRef(collectionName, documentId);
      const payload = { ...value, updatedAt: now() };
      await ref.set(payload, { merge });
      return { id: documentId, ...payload };
    },

    async delete(collectionName, documentId) {
      await documentRef(collectionName, documentId).delete();
      return { id: documentId, deleted: true };
    },

    async transact(work) {
      if (typeof work !== 'function') throw new Error('transaction_work_required');
      if (typeof db.runTransaction !== 'function') throw new Error('firestore_transaction_required');
      return db.runTransaction((transaction) => work({ transaction, documentRef }));
    }
  });
}
