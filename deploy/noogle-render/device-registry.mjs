import { randomUUID, createHash } from 'node:crypto';

// NSEC-099 contract only: this module is not mounted on public HTTP routes.
// A production adapter must verify NEO Pass session, device-bound proof and
// account scope before calling any mutating method.
const digest = value => createHash('sha256').update(value).digest('hex');
const validType = new Set(['android','chromebook']);
export function createDeviceRegistry({store, verifyIdentity, verifyEnrollmentProof, now=()=>Date.now()}) {
  if(!store || typeof store.enrollAtomically!=='function' || typeof verifyIdentity!=='function' || typeof verifyEnrollmentProof!=='function') throw Error('secure_store_and_identity_required');
  async function authorized(context) {
    const identity=await verifyIdentity(context);
    if(!identity?.subject || identity.assurance!=='device-bound') throw Error('authentication_required');
    return identity.subject;
  }
  return Object.freeze({
    async list(context) {
      const subject=await authorized(context);
      return (await store.list(subject)).map(({id,type,label,createdAt,revokedAt})=>({id,type,label,createdAt,revokedAt}));
    },
    async enroll(context,{type,label,publicKey,challenge}) {
      const subject=await authorized(context);
      if(!validType.has(type) || typeof label!=='string' || label.length<1 || label.length>80 ||
        typeof publicKey!=='string' || publicKey.length<32 || publicKey.length>8192)
        throw Error('enrollment_preconditions_failed');
      const verified=await verifyEnrollmentProof({subject,type,publicKey,challenge});
      if(verified!==true) throw Error('enrollment_proof_not_verified');
      const record={id:randomUUID(),subject,type,label,publicKeyHash:digest(publicKey),createdAt:now(),revokedAt:null};
      // Adapter must consume the verified challenge and insert the device in one
      // database transaction with uniqueness and replay prevention enforced.
      await store.enrollAtomically({record,challenge});
      return {id:record.id,type,label,createdAt:record.createdAt};
    },
    async revoke(context,id) {
      const subject=await authorized(context);
      if(typeof id!=='string' || !/^[0-9a-f-]{36}$/i.test(id))throw Error('invalid_device_id');
      // Atomic account-scoped update must be provided by durable store.
      const changed=await store.revokeIfOwned(subject,id,now());
      if(!changed)throw Error('device_not_found');
      return {id,revoked:true};
    }
  });
}
