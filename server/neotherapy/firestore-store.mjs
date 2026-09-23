import {createFirestoreRestDb} from '../neo-counter-backend/firestore-rest-db.mjs'
const key=(...parts)=>parts.map(v=>encodeURIComponent(String(v))).join('__')
export class FirestoreNeotherapyStore{
 constructor({projectId=process.env.GOOGLE_CLOUD_PROJECT||process.env.GCP_PROJECT_ID||process.env.GCLOUD_PROJECT,databaseId=process.env.NEOTHERAPY_FIRESTORE_DATABASE||process.env.FIRESTORE_DATABASE_ID||'(default)',db}={}){
  this.db=db||createFirestoreRestDb({projectId,databaseId});this.prefix='neotherapy_'
 }
 async getConsent(p,m){const s=await this.db.collection(this.prefix+'consents').doc(key(p,m)).get();return s.exists?s.data():undefined}
 async saveConsent(r){await this.db.collection(this.prefix+'consents').doc(key(r.participantId,r.modalityId)).set({...r,updatedAt:new Date().toISOString()})}
 async getCredential(p){const s=await this.db.collection(this.prefix+'credentials').doc(key(p)).get();return s.exists?s.data():undefined}
 async saveCredential(r){await this.db.collection(this.prefix+'credentials').doc(key(r.practitionerId)).set({...r,updatedAt:new Date().toISOString()})}
 async getSession(id){const s=await this.db.collection(this.prefix+'sessions').doc(key(id)).get();return s.exists?s.data():undefined}
 async saveSession(r){await this.db.collection(this.prefix+'sessions').doc(key(r.id)).set({...r,updatedAt:new Date().toISOString()})}
 async appendAudit(e){await this.db.collection(this.prefix+'audit').doc(key(e.id)).set({...e,createdAt:e.timestamp||new Date().toISOString()})}
}
