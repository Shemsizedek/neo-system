import {readFile,writeFile} from 'node:fs/promises'
import {buildReleaseAttestation,signReleaseAttestation,verifyReleaseAttestation} from './releasePromotion.mjs'

const input=process.env.NEO_PRODUCTION_ATTESTATION||'production-attestation.json'
const output=process.env.NEO_RELEASE_ATTESTATION_OUTPUT||'release-attestation.json'
const commitSha=String(process.env.NEO_RELEASE_COMMIT_SHA||'')
const imageDigest=String(process.env.NEO_RELEASE_IMAGE_DIGEST||'')
const secret=String(process.env.NEO_RELEASE_ATTESTATION_SIGNING_SECRET||'')
const maxAgeMs=Number(process.env.NEO_RELEASE_ATTESTATION_MAX_AGE_MS||30*60*1000)
if(!commitSha||!imageDigest||!secret)throw new Error('RELEASE_ATTESTATION_CONFIGURATION_REQUIRED')

const production=JSON.parse(await readFile(input,'utf8'))
const payload=buildReleaseAttestation({attestation:production,commitSha,imageDigest})
const signed=signReleaseAttestation(payload,secret)
verifyReleaseAttestation(signed,{secret,expectedCommitSha:commitSha,expectedImageDigest:imageDigest,maxAgeMs})
await writeFile(output,`${JSON.stringify(signed,null,2)}\n`,{mode:0o600})
console.log(JSON.stringify({schema:signed.schema,commitSha:signed.commitSha,imageDigest:signed.imageDigest,productionState:signed.productionAttestation.state,output},null,2))
