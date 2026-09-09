import { Firestore } from '@google-cloud/firestore';
import { createFirestoreTempleRegistry } from './firestore-temple-registry.mjs';
import { createTempleGissRuntime } from './temple-giss-runtime.mjs';
import { createNeopassSubjectResolver } from './integration-hub.mjs';
import { createNeoPlatformApi } from './server.mjs';

export function createGissProductionServer({
  projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID,
  databaseId = process.env.NEO_TEMPLE_FIRESTORE_DATABASE || '(default)',
  jwtSecret = process.env.NEO_PASS_JWT_SECRET,
  jwtIssuer = process.env.NEO_PASS_JWT_ISSUER,
  now = () => new Date().toISOString()
} = {}) {
  if (!projectId) throw new Error('gcp_project_required');
  if (!jwtSecret) throw new Error('neopass_jwt_secret_required');

  const db = new Firestore({ projectId, databaseId });
  const registry = createFirestoreTempleRegistry({ db, now });
  const templeGissRuntime = createTempleGissRuntime({ registry, now });
  const subjectResolver = createNeopassSubjectResolver({ secret: jwtSecret, issuer: jwtIssuer });

  return createNeoPlatformApi({ templeGissRuntime, subjectResolver, now });
}

export function startGissProductionServer({ port = Number(process.env.PORT || 8080) } = {}) {
  const server = createGissProductionServer();
  server.listen(port, () => console.log(`NEO Temple GISS production API listening on :${port}`));
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) startGissProductionServer();
