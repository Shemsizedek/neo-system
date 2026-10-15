// Inactive device management contract. All identity attributes MUST come from
// a trusted server-side NEO Pass + WebAuthn verifier, not browser request data.
export function createDeviceLifecycle({store,verifyIdentity,now=()=>Date.now()}) {
 if(!store?.list || !store?.renameIfOwned || !store?.revokeIfOwned || typeof verifyIdentity!=='function')
   throw Error('trusted_device_dependencies_required');
 async function owner(context) {
  const identity=await verifyIdentity(context);
  if(!identity?.subject || identity.assurance!=='device-bound')throw Error('device_authentication_required');
  return identity.subject;
 }
 return Object.freeze({
  async list(context) {
   const subject=await owner(context);
   return (await store.list(subject)).map(({id,type,label,createdAt,revokedAt})=>({id,type,label,createdAt,revokedAt}));
  },
  async rename(context,id,label) {
   const subject=await owner(context);
   if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id)||
     typeof label!=='string'||label.trim().length<1||label.length>80)
     throw Error('invalid_device_update');
   if(!await store.renameIfOwned(subject,id,label.trim()))throw Error('device_not_found');
   return {id,label:label.trim()};
  },
  async revoke(context,id) {
   const subject=await owner(context);
   if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))throw Error('invalid_device_id');
   if(!await store.revokeIfOwned(subject,id,now()))throw Error('device_not_found');
   return {id,revoked:true};
  }
 });
}
