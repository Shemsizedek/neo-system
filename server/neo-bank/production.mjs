import {Firestore} from '@google-cloud/firestore';
import {createNeoBankFirestoreStore} from './firestore-store.mjs';
import {createNeoBankServer} from './server.mjs';
import {OAuth2Client} from 'google-auth-library';

const projectId=process.env.GOOGLE_CLOUD_PROJECT||process.env.GCP_PROJECT_ID;
if(!projectId) throw new Error('gcp_project_required');
const db=new Firestore({projectId,databaseId:process.env.NEO_BANK_FIRESTORE_DATABASE||'(default)'});
const googleClient=new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);
const verifyGoogleCredential=async(credential,audience)=>(await googleClient.verifyIdToken({idToken:credential,audience})).getPayload();
const server=createNeoBankServer({store:createNeoBankFirestoreStore({db}),verifyGoogleCredential});
const port=Number(process.env.PORT||8080);
server.listen(port,()=>console.log(`NEO Bank community CES listening on :${port}`));
