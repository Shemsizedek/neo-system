import { randomUUID, createHash } from 'node:crypto'
import { createFirestoreRestDb } from '../neo-counter-backend/firestore-rest-db.mjs'

const PROJECTS='neo_muse_projects'
const EVENTS='neo_muse_transfer_events'

function nowIso(now=()=>new Date()){ return now().toISOString() }
function clean(value,max=240){ return String(value??'').trim().replace(/\s+/g,' ').slice(0,max) }
function hash(value){ return 'sha256:'+createHash('sha256').update(String(value??'')).digest('hex') }

export function createMuseProjectStore({projectId,databaseId='(default)',db,now=()=>new Date()}={}){
  const firestore=db??createFirestoreRestDb({projectId,databaseId})

  async function createProject({subjectId,name,description=''}){
    if(!subjectId) throw new Error('subject_required')
    const id=randomUUID(),ts=nowIso(now)
    const project={id,subjectId,name:clean(name)||'Untitled Muse/NEO Project',description:clean(description,1000),createdAt:ts,updatedAt:ts,lastTransferAt:null,transferCount:0}
    await firestore.collection(PROJECTS).doc(id).set(project)
    return project
  }

  async function getProject({subjectId,projectId}){
    const snap=await firestore.collection(PROJECTS).doc(projectId).get()
    if(!snap.exists) return null
    const project=snap.data()
    if(project.subjectId!==subjectId) throw new Error('project_forbidden')
    return project
  }

  async function listProjects({subjectId,limit=50}){
    const snap=await firestore.collection(PROJECTS).where('subjectId','==',subjectId).orderBy('subjectId','asc').limit(Math.min(Math.max(Number(limit)||50,1),100)).get()
    return snap.docs.map(d=>d.data()).sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')))
  }

  async function recordTransfer({subjectId,projectId,direction,threadId,content,summary='',source='NEOsync',metadata={}}){
    const project=await getProject({subjectId,projectId})
    if(!project) throw new Error('project_not_found')
    const ts=nowIso(now),id=randomUUID()
    const previous=await listTransfers({subjectId,projectId,limit:1})
    const event={
      id,projectId,subjectId,direction,threadId:threadId||null,source:clean(source,120),summary:clean(summary,1000),
      contentHash:hash(content),characterCount:String(content??'').length,createdAt:ts,previousTransferId:previous[0]?.id??null,metadata
    }
    await firestore.collection(EVENTS).doc(id).set(event)
    await firestore.collection(PROJECTS).doc(projectId).set({...project,updatedAt:ts,lastTransferAt:ts,transferCount:(project.transferCount||0)+1})
    return event
  }

  async function listTransfers({subjectId,projectId,limit=50}){
    await getProject({subjectId,projectId})
    const snap=await firestore.collection(EVENTS).where('projectId','==',projectId).orderBy('projectId','asc').limit(Math.min(Math.max(Number(limit)||50,1),100)).get()
    return snap.docs.map(d=>d.data()).filter(e=>e.subjectId===subjectId).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||'')))
  }

  function compareTransfers(current,previous){
    if(!current) return {changed:false,summary:'No transfer selected.'}
    if(!previous) return {changed:true,summary:'First recorded transfer in this project.',currentHash:current.contentHash,previousHash:null}
    const changed=current.contentHash!==previous.contentHash
    return {changed,currentHash:current.contentHash,previousHash:previous.contentHash,summary:changed?'Content changed since the previous transfer.':'No content change detected since the previous transfer.'}
  }

  return {createProject,getProject,listProjects,recordTransfer,listTransfers,compareTransfers}
}
