// NSEC-109: Inactive composition boundary. Not imported by the public HTTP server.
// An authenticated session alone is insufficient: each request requires a
// fresh, verified device-bound assertion tied to the same NEO Pass subject.
export function createAuthenticatedDeviceBoundary({verifySession,verifyDeviceAssertion,deviceLifecycle}) {
 if(typeof verifySession!=='function'||typeof verifyDeviceAssertion!=='function'||
    !deviceLifecycle?.list||!deviceLifecycle?.rename||!deviceLifecycle?.revoke)
   throw Error('trusted_boundary_dependencies_required');
 async function context(sessionToken,assertion) {
   const session=await verifySession(sessionToken);
   if(!session?.subject||session.assurance!=='session-only')throw Error('session_required');
   const device=await verifyDeviceAssertion({assertion,subject:session.subject});
   if(!device||device.subject!==session.subject||device.assurance!=='device-bound'||
      typeof device.credentialId!=='string'||!device.credentialId)
     throw Error('device_proof_required');
   // Construct trusted context internally; never forward client fields.
   return Object.freeze({subject:session.subject,assurance:'device-bound',credentialId:device.credentialId});
 }
 return Object.freeze({
   async list({sessionToken,assertion}) {
     return deviceLifecycle.list(await context(sessionToken,assertion));
   },
   async rename({sessionToken,assertion,id,label}) {
     return deviceLifecycle.rename(await context(sessionToken,assertion),id,label);
   },
   async revoke({sessionToken,assertion,id}) {
     return deviceLifecycle.revoke(await context(sessionToken,assertion),id);
   }
 });
}
