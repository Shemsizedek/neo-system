import test from 'node:test'
import assert from 'node:assert/strict'
import {buildRuntimeDriftDiscordMessage,notifyRuntimeDriftDiscord} from './driftDiscord.mjs'
import {resolveIncident} from './incidents.mjs'

const incident={id:'INC-1',state:'OPEN',reason:'RUNTIME_IDENTITY_DRIFT',severity:'CRITICAL',source:'RUNTIME_IDENTITY',manualResolutionAllowed:false}
const attestation={identity:{environment:'production',buildCommitSha:'a'.repeat(40),authorizedCommitSha:'b'.repeat(40),runtimeImageDigest:'sha256:'+'c'.repeat(64),authorizedImageDigest:'sha256:'+'d'.repeat(64)},drift:{state:'DRIFT',holdFinancialMutations:true,reasons:['COMMIT_DRIFT']}}

test('runtime drift incident cannot be manually resolved',()=>{
  assert.throws(()=>resolveIncident(incident,{operatorId:'treasury',resolutionCode:'CHAIN_VERIFIED'}),/MANUAL_RESOLUTION_FORBIDDEN/)
})

test('Discord emergency payload contains operational evidence without secrets',()=>{
  const payload=buildRuntimeDriftDiscordMessage({type:'OPENED',incident,attestation})
  assert.match(payload.content,/FINANCIAL MUTATIONS HELD/)
  assert.match(payload.content,/COMMIT_DRIFT/)
  assert.equal(payload.allowed_mentions.parse.length,0)
  assert.equal(payload.content.includes('webhook'),false)
})

test('Discord notification failure is non-bypassing and returns failure state',async()=>{
  const result=await notifyRuntimeDriftDiscord({type:'OPENED',incident,attestation},{webhookUrl:'https://discord.invalid/test',fetchImpl:async()=>({ok:false,status:500})})
  assert.equal(result.sent,false)
  assert.equal(result.reason,'DISCORD_HTTP_500')
})
