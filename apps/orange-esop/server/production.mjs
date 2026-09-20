import { Firestore } from '@google-cloud/firestore';
import { createFirestoreEsopStore } from './firestore-store.mjs';
import { startOrangeEsopServer } from './server.mjs';

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID;
if (!projectId) throw new Error('gcp_project_required');

const roleTokens = Object.fromEntries([
  ['WORLD_CHAPLAIN', process.env.ORANGE_ESOP_WORLD_CHAPLAIN_TOKEN],
  ['ASSISTANT_GRAND_SHEIK', process.env.ORANGE_ESOP_ASSISTANT_GRAND_SHEIK_TOKEN],
  ['SECRETARY', process.env.ORANGE_ESOP_SECRETARY_TOKEN],
  ['TREASURER', process.env.ORANGE_ESOP_TREASURER_TOKEN],
  ['PLAN_ADMINISTRATOR', process.env.ORANGE_ESOP_PLAN_ADMINISTRATOR_TOKEN],
  ['ESOP_TRUSTEE', process.env.ORANGE_ESOP_TRUSTEE_TOKEN],
  ['AUDITOR', process.env.ORANGE_ESOP_AUDITOR_TOKEN]
].filter(([, value]) => value));

const db = new Firestore({ projectId });
const store = createFirestoreEsopStore({ db });

startOrangeEsopServer({
  port: Number(process.env.PORT || 8080),
  store,
  roleTokens
});
