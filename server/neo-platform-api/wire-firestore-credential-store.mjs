// Firestore credential persistence adapter for NEO-WIRE-004E.
// Requires an authenticated Firestore CollectionReference and security rules
// restricting direct client access. Only trusted server code may use this.
export function createWireFirestoreCredentialStore(collection) {
  if(!collection || typeof collection.doc!=='function' || !collection.firestore || typeof collection.firestore.runTransaction!=='function') {
    throw new Error('firestore_collection_required');
  }
  const ref=id=>{
    if(typeof id!=='string'||!id||id.length>1024||id.includes('/')) throw new Error('invalid_credential_id');
    return collection.doc(id);
  };
  return {
    async get(id) {
      const snapshot=await ref(id).get();
      return snapshot.exists?snapshot.data():null;
    },
    async put(id,record,{createOnly=false}={}) {
      if(!createOnly) throw new Error('create_only_required');
      await ref(id).create(record); // atomic create; fails on duplicate
    },
    async delete() {throw new Error('credential_deletion_disabled_use_revocation')},
    async compareAndSwap(id,expected,next) {
      const document=ref(id);
      return collection.firestore.runTransaction(async tx=>{
        const snapshot=await tx.get(document);
        if(!snapshot.exists) return false;
        const current=snapshot.data();
        if(JSON.stringify(current)!==JSON.stringify(expected)) return false;
        tx.set(document,next);
        return true;
      });
    }
  };
}
