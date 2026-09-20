import { Firestore } from '@google-cloud/firestore';
import { createFirestoreEsopStore } from './firestore-store.mjs';
import { startOrangeEsopServer } from './server.mjs';

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
if (!projectId) throw new Error('gcp_project_required');

const db = new Firestore({ projectId });
const store = createFirestoreEsopStore({ db });

startOrangeEsopServer({
  port: Number(process.env.PORT || 8080),
  store
});
