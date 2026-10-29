import pg from 'pg';
import {createNeoBankPostgresStore,migrateNeoBankPostgres} from './postgres-store.mjs';
import {createNeoBankServer} from './server.mjs';
import {OAuth2Client} from 'google-auth-library';

if(!process.env.DATABASE_URL)throw new Error('database_url_required');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},max:10});
await migrateNeoBankPostgres(pool);
const googleClient=new OAuth2Client(process.env.GOOGLE_OAUTH_CLIENT_ID);
const verifyGoogleCredential=async(credential,audience)=>(await googleClient.verifyIdToken({idToken:credential,audience})).getPayload();
const server=createNeoBankServer({store:createNeoBankPostgresStore({pool}),verifyGoogleCredential});
const port=Number(process.env.PORT||8080);
server.listen(port,'0.0.0.0',()=>console.log(`NEO Bank community CES listening on :${port}`));
