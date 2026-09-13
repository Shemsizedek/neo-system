import { Firestore } from '@google-cloud/firestore';
import { createFirestoreTempleRegistry } from './firestore-temple-registry.mjs';
import { createTempleGissRuntime } from './temple-giss-runtime.mjs';
import { createNeopassSubjectResolver } from './integration-hub.mjs';
import { createNeoPlatformApi } from './server.mjs';
import { OAuth2Client } from 'google-auth-library';
import { createGoogleNeopassAuth } from './neopass-google-auth.mjs';
import { createFirestoreCrmStore } from './firestore-crm-store.mjs';
import { createFirestoreSchoolStore } from './firestore-school-store.mjs';
import { createSchoolActionHandler } from './giss-school-actions.mjs';
import { attachNeopassBrowserTokenExchange } from './browser-token-exchange.mjs';

export function createGissProductionServer({
  projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID,
  databaseId = process.env.NEO_TEMPLE_FIRESTORE_DATABASE || '(default)',
  jwtSecret = process.env.NEO_PASS_JWT_SECRET,
  jwtIssuer = process.env.NEO_PASS_JWT_ISSUER,
  googleClientId = process.env.GOOGLE_OAUTH_CLIENT_ID,
  executiveAdminEmail = process.env.NEO_EXECUTIVE_ADMIN_EMAIL,
  executiveAdminUsername = process.env.NEO_EXECUTIVE_ADMIN_USERNAME || 'Shemsizedek',
  now = () => new Date().toISOString()
} = {}) {
  if (!projectId) throw new Error('gcp_project_required');
  if (!jwtSecret) throw new Error('neopass_jwt_secret_required');

  const db = new Firestore({ projectId, databaseId });
  const registry = createFirestoreTempleRegistry({ db, now });
  const crmStore = createFirestoreCrmStore({ db, now });
  const schoolStore = createFirestoreSchoolStore({ db, now });
  const templeGissRuntime = createTempleGissRuntime({ registry, now });
  const subjectResolver = createNeopassSubjectResolver({ secret: jwtSecret, issuer: jwtIssuer });
  const googleClient = new OAuth2Client(googleClientId);
  const verifyGoogleCredential = async (credential, audience) => {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience });
    return ticket.getPayload();
  };
  const authService = createGoogleNeopassAuth({ clientId: googleClientId, jwtSecret, jwtIssuer, registry, verifyGoogleCredential, executiveAdminEmail, executiveAdminUsername });

  const server = createNeoPlatformApi({ templeGissRuntime, subjectResolver, authService, crmStore, schoolStore, now });
  const coreHandler = server.listeners('request')[0];
  const schoolActions = createSchoolActionHandler({ schoolStore, subjectResolver });
  server.removeAllListeners('request');
  server.on('request', async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://neo.local');
      if (await schoolActions(req, res, url)) return;
      return coreHandler(req, res);
    } catch (error) {
      console.error('GISS production route failure:', error?.code || error?.message || 'unknown');
      if (!res.headersSent) res.writeHead(500, {'content-type':'application/json; charset=utf-8'});
      if (!res.writableEnded) res.end(JSON.stringify({error:'giss_route_failure'}));
    }
  });
  return attachNeopassBrowserTokenExchange(server, { authService, subjectResolver });
}

export function startGissProductionServer({ port = Number(process.env.PORT || 8080) } = {}) {
  const server = createGissProductionServer();
  server.listen(port, () => console.log(`NEO Temple GISS production API listening on :${port}`));
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) startGissProductionServer();
