import {readFile,writeFile} from 'node:fs/promises'
import {buildDeploymentRecord,signDeploymentRecord,verifyDeploymentRecord} from './deploymentProvenance.mjs'

const releaseFile=process.env.NEO_RELEASE_ATTESTATION||'release-attestation.json'
const historyFile=process.env.NEO_DEPLOYMENT_HISTORY||'deployment-history.json'
const output=process.env.NEO_DEPLOYMENT_HISTORY_OUTPUT||'deployment-history.next.json'
const recordOutput=process.env.NEO_DEPLOYMENT_RECORD_OUTPUT||'deployment-record.json'
const releaseSecret=String(process.env.NEO_RELEASE_ATTESTATION_SIGNING_SECRET||'')
const provenanceSecret=String(process.env.NEO_DEPLOYMENT_PROVENANCE_SIGNING_SECRET||'')
const observedCommitSha=String(process.env.NEO_OBSERVED_COMMIT_SHA||'')
const observedImageDigest=String(process.env.NEO_OBSERVED_IMAGE_DIGEST||'')
const action=String(process.env.NEO_DEPLOYMENT_ACTION||'DEPLOY').toUpperCase()
if(!releaseSecret||!provenanceSecret||!observedCommitSha||!observedImageDigest)throw new Error('DEPLOYMENT_PROVENANCE_CONFIGURATION_REQUIRED')

let history=[]
try{history=JSON.parse(await readFile(historyFile,'utf8'))}catch(error){if(error?.code!=='ENOENT')throw error}
if(!Array.isArray(history))throw new Error('DEPLOYMENT_HISTORY_INVALID')
let previous=null
for(const document of history){verifyDeploymentRecord(document,{secret:provenanceSecret,previousRecord:previous});previous=document}
const releaseAttestation=JSON.parse(await readFile(releaseFile,'utf8'))
const record=signDeploymentRecord(buildDeploymentRecord({releaseAttestation,releaseSecret,observedCommitSha,observedImageDigest,action,previousRecord:previous}),provenanceSecret)
verifyDeploymentRecord(record,{secret:provenanceSecret,previousRecord:previous})
const next=[...history,record]
await writeFile(recordOutput,`${JSON.stringify(record,null,2)}\n`,{mode:0o600})
await writeFile(output,`${JSON.stringify(next,null,2)}\n`,{mode:0o600})
console.log(JSON.stringify({state:'RECORDED',action,commitSha:record.observed.commitSha,imageDigest:record.observed.imageDigest,sequence:next.length,recordOutput,historyOutput:output},null,2))
