import {readFile,writeFile} from 'node:fs/promises'
import {authorizeRollback} from './deploymentProvenance.mjs'
import {verifyReleaseAttestation} from './releasePromotion.mjs'

const releaseFile=process.env.NEO_ROLLBACK_RELEASE_ATTESTATION||'rollback-release-attestation.json'
const historyFile=process.env.NEO_DEPLOYMENT_HISTORY||'deployment-history.json'
const output=process.env.NEO_ROLLBACK_AUTHORIZATION_OUTPUT||'rollback-authorization.json'
const releaseSecret=String(process.env.NEO_RELEASE_ATTESTATION_SIGNING_SECRET||'')
const provenanceSecret=String(process.env.NEO_DEPLOYMENT_PROVENANCE_SIGNING_SECRET||'')
const currentCommitSha=String(process.env.NEO_CURRENT_COMMIT_SHA||'')
const currentImageDigest=String(process.env.NEO_CURRENT_IMAGE_DIGEST||'')
if(!releaseSecret||!provenanceSecret)throw new Error('ROLLBACK_AUTHORIZATION_CONFIGURATION_REQUIRED')
const releaseDocument=JSON.parse(await readFile(releaseFile,'utf8'))
const release=verifyReleaseAttestation(releaseDocument,{secret:releaseSecret,maxAgeMs:Number.MAX_SAFE_INTEGER})
const history=JSON.parse(await readFile(historyFile,'utf8'))
if(!Array.isArray(history))throw new Error('DEPLOYMENT_HISTORY_INVALID')
const authorization=authorizeRollback({targetCommitSha:release.commitSha,targetImageDigest:release.imageDigest,history,provenanceSecret,currentCommitSha:currentCommitSha||null,currentImageDigest:currentImageDigest||null})
const document={schema:'neo-miner-rollback-authorization/v1',generatedAt:new Date().toISOString(),...authorization}
await writeFile(output,`${JSON.stringify(document,null,2)}\n`,{mode:0o600})
console.log(JSON.stringify({state:'AUTHORIZED',target:authorization.target,priorDeployment:authorization.priorDeployment,output},null,2))
