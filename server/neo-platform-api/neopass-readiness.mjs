import { isAbsolute } from 'node:path';
// Presence checks only; mounted storage and device enrollment require live verification.
export function inspectNeopassReadiness(env={}) {
 let secureOrigin=false;
 try {const url=new URL(env.NEO_PASS_ORIGIN);secureOrigin=url.protocol==='https:' && url.origin===env.NEO_PASS_ORIGIN;} catch {}
 const requirements={
  storage: typeof env.NEO_PASS_DB_PATH==='string' && isAbsolute(env.NEO_PASS_DB_PATH) && !/^\/(?:tmp|var\/tmp)(?:\/|$)/.test(env.NEO_PASS_DB_PATH) && env.NEO_PASS_STORAGE_DURABLE==='true',
  signingSecret: typeof env.NEO_PASS_JWT_SECRET==='string' && env.NEO_PASS_JWT_SECRET.length>=32,
  secureOrigin
 };
 return {ready:Object.values(requirements).every(Boolean),checks:requirements,runtime:'native-device-passkeys',googleRequired:false,note:'Presence checks only; durable volume, exact-origin TLS, backup/restore and a real authenticator must be verified before activation.'};
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href) {
 const result=inspectNeopassReadiness(process.env);console.log(JSON.stringify(result));if(!result.ready)process.exitCode=1;
}
