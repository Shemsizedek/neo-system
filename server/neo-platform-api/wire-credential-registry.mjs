// NEO-WIRE-004D: Credential registry contract. Staging-only; no auth endpoint.
// A production adapter must persist records transactionally in Firestore or SQL.
export class WireCredentialRegistry {
  constructor({store}={}) {
    if(!store || typeof store.get!=='function' || typeof store.put!=='function' || typeof store.delete!=='function') throw new Error('durable_store_required');
    this.store=store;
  }
  async register({credentialId,memberId,publicKey,signCount=0,transports=[],rpId}) {
    if(!credentialId||!memberId||!publicKey||!rpId||!Number.isSafeInteger(signCount)||signCount<0) throw new Error('invalid_credential');
    if(await this.store.get(credentialId)) throw new Error('credential_already_registered');
    const record={credentialId,memberId,publicKey,signCount,transports,rpId,revoked:false};
    await this.store.put(credentialId,record,{createOnly:true});
    return {credentialId,memberId,rpId,revoked:false};
  }
  async getForVerification({credentialId,memberId,rpId}) {
    const record=await this.store.get(credentialId);
    if(!record||record.revoked||record.memberId!==memberId||record.rpId!==rpId) return null;
    return record;
  }
  async updateCounter({credentialId,memberId,rpId,expectedCounter,newCounter}) {
    if(!Number.isSafeInteger(newCounter)||newCounter<0) throw new Error('invalid_counter');
    const record=await this.getForVerification({credentialId,memberId,rpId});
    if(!record||record.signCount!==expectedCounter) return false;
    // A zero counter is allowed for authenticators that do not implement counters.
    if(record.signCount!==0 && newCounter<=record.signCount) return false;
    if(typeof this.store.compareAndSwap!=='function') throw new Error('atomic_update_required');
    return !!(await this.store.compareAndSwap(credentialId,record,{...record,signCount:newCounter}));
  }
  async revoke({credentialId,memberId,rpId}) {
    const record=await this.getForVerification({credentialId,memberId,rpId});
    if(!record) return false;
    if(typeof this.store.compareAndSwap!=='function') throw new Error('atomic_update_required');
    return !!(await this.store.compareAndSwap(credentialId,record,{...record,revoked:true}));
  }
}
