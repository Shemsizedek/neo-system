import { isAbsolute } from 'node:path';
import { createPasskeyStore } from './neopass-passkey-store.mjs';
import { createPasskeyAuth } from './neopass-passkeys.mjs';

export function nativePasskeyRuntime(env=process.env) {
  const path=env.NEO_PASS_DB_PATH;
  // Never enroll against an ephemeral Render filesystem or silently use memory.
  if(!path || !isAbsolute(path) || /^\/(?:tmp|var\/tmp)(?:\/|$)/.test(path) || env.NEO_PASS_STORAGE_DURABLE!=='true' || !env.NEO_PASS_JWT_SECRET || env.NEO_PASS_JWT_SECRET.length<32 || !env.NEO_PASS_ORIGIN) {
    console.warn('NEOpass device passkeys unavailable: durable storage, origin and signing configuration required.');
    return {subjectResolver:()=>null,authService:null,passkeyService:null};
  }
  const origin=new URL(env.NEO_PASS_ORIGIN).origin;
  if(origin!==env.NEO_PASS_ORIGIN) throw Error('neopass_exact_origin_required');
  const store=createPasskeyStore(path);
  const auth=createPasskeyAuth({store,secret:env.NEO_PASS_JWT_SECRET,origin,rpID:new URL(origin).hostname});
  return {subjectResolver:auth.subjectResolver,authService:auth,passkeyService:auth};
}
