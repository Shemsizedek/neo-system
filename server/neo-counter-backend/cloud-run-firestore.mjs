import { createFirestoreRestDb } from './firestore-rest-db.mjs';
import { startFirestoreServer } from './firestore-server.mjs';

const projectId=process.env.GOOGLE_CLOUD_PROJECT||process.env.GCP_PROJECT_ID||'';
const databaseId=process.env.FIRESTORE_DATABASE_ID||'(default)';

if(!projectId)throw new Error('GOOGLE_CLOUD_PROJECT_or_GCP_PROJECT_ID_required');

const db=createFirestoreRestDb({projectId,databaseId});

// Force a real authenticated Firestore round-trip before accepting traffic.
// A missing sentinel document is fine; authentication/IAM/network failure is not.
await db.collection('neo_counter_meta').doc('runtime-health').get();

startFirestoreServer({db});
