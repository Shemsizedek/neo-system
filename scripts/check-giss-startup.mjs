import { pathToFileURL } from 'node:url';

export const INPUTS = Object.freeze([
  'GOOGLE_CLOUD_PROJECT', 'GCP_PROJECT_ID', 'NEO_PASS_JWT_SECRET', 'GOOGLE_OAUTH_CLIENT_ID',
]);

// Consume booleans only. This diagnostic must never return configuration values.
export function assessGissStartup(presence) {
  if (!presence || typeof presence !== 'object' || Array.isArray(presence)
      || Object.keys(presence).some(key => !INPUTS.includes(key))
      || INPUTS.some(key => typeof presence[key] !== 'boolean')) {
    throw new Error('Exactly four boolean presence flags are required');
  }
  const project = presence.GOOGLE_CLOUD_PROJECT || presence.GCP_PROJECT_ID;
  const missingRequirements = [];
  if (!project) missingRequirements.push('GOOGLE_CLOUD_PROJECT or GCP_PROJECT_ID');
  if (!presence.NEO_PASS_JWT_SECRET) missingRequirements.push('NEO_PASS_JWT_SECRET');
  if (!presence.GOOGLE_OAUTH_CLIENT_ID) missingRequirements.push('GOOGLE_OAUTH_CLIENT_ID');
  return {
    schema: 1,
    scope: 'server/neo-platform-api/server.mjs startup prerequisites only',
    expectedBootstrap: missingRequirements.length ? 'fallback-without-auth-service' : 'attempt-giss-production',
    prerequisitesPresent: missingRequirements.length === 0,
    missingRequirements,
    credentialValues: 'not-included',
    googleClientValidity: 'unverified',
    secretStrength: 'unverified',
    firestoreAccess: 'unverified',
    authentication: 'not-tested',
    liveDeployment: 'not-verified-by-this-command',
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.length !== 2) {
    console.error('Run without arguments in the protected service environment. Do not pass credentials.');
    process.exitCode = 2;
  } else {
    const presence = Object.fromEntries(INPUTS.map(key => [key, Boolean(process.env[key])]));
    const report = assessGissStartup(presence);
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.prerequisitesPresent ? 0 : 2;
  }
}
