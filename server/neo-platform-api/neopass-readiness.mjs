// Non-secret NEO Pass infrastructure readiness. No network calls or credentials exposed.
export function inspectNeopassReadiness(env={}) {
 const requirements={
  project: Boolean(env.GOOGLE_CLOUD_PROJECT || env.GCP_PROJECT_ID),
  signingSecret: typeof env.NEO_PASS_JWT_SECRET==='string' && env.NEO_PASS_JWT_SECRET.length>=32,
  googleClient: Boolean(env.GOOGLE_OAUTH_CLIENT_ID),
  administrator: Boolean(env.NEO_EXECUTIVE_ADMIN_EMAIL),
 };
 return {ready:Object.values(requirements).every(Boolean),checks:requirements,
  runtime:'giss-production',note:'Presence checks only; OAuth, Firestore, login, and persistence require separate live certification'};
}
if(process.argv[1] && import.meta.url===new URL('file://'+process.argv[1]).href) {
 const result=inspectNeopassReadiness(process.env);
 console.log(JSON.stringify(result));
 if(!result.ready)process.exitCode=1;
}
