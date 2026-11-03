import test from 'node:test'
import assert from 'node:assert/strict'
import { createPublicKey, generateKeyPairSync, randomBytes, sign } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { request } from 'node:https'
import { createBoundMtlsPilot } from './mtls-pilot-007.mjs'
import { createOmarchyStagingCoordinator } from './staging-coordinator.mjs'
import { createStagingAuditCommitment, verifyStagingAuditCommitment } from './audit-commitment-007.mjs'

const machineId = 'neo:machine:omarchy-tls-ci'
const otherId = 'neo:machine:omarchy-unknown'
const signingKey = generateKeyPairSync('ed25519')
const machineKey = generateKeyPairSync('ed25519')
const intruderKey = generateKeyPairSync('ed25519')
const pem = (key, privateKey = false) =>
  key.export({ format: 'pem', type: privateKey ? 'pkcs8' : 'spki' })
const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value && typeof value === 'object' ?
    Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value

function generateTlsFixtures() {
  const dir = mkdtempSync(join(tmpdir(), 'neo-omarchy-007-'))
  const openssl = (...args) => execFileSync('openssl', args, {
    cwd: dir, stdio: 'ignore', timeout: 10_000,
  })
  // Short-lived, test-only CA. All generated keys remain outside the repo.
  openssl('req', '-new', '-x509', '-newkey', 'rsa:2048',
    '-nodes', '-days', '1', '-subj', '/CN=NEO Omarchy CI CA',
    '-keyout', 'ca.key', '-out', 'ca.crt')
  function certificate(name, privatePem, subject, extensions) {
    writeFileSync(join(dir, name + '.key'), privatePem, { mode: 0o600 })
    openssl('req', '-new', '-key', name + '.key', '-out', name + '.csr',
      '-subj', '/CN=' + subject)
    writeFileSync(join(dir, name + '.ext'), extensions)
    openssl('x509', '-req', '-in', name + '.csr', '-CA', 'ca.crt',
      '-CAkey', 'ca.key', '-CAcreateserial', '-days', '1',
      '-extfile', name + '.ext', '-out', name + '.crt')
    return { key: readFileSync(join(dir, name + '.key')),
      cert: readFileSync(join(dir, name + '.crt')) }
  }
  const serverKey = generateKeyPairSync('ed25519')
  return {
    dir, ca: readFileSync(join(dir, 'ca.crt')),
    server: certificate('server', pem(serverKey.privateKey, true),
      'coordinator.neo.internal',
      'subjectAltName=DNS:coordinator.neo.internal\nextendedKeyUsage=serverAuth\nkeyUsage=digitalSignature\n'),
    device: certificate('client', pem(machineKey.privateKey, true),
      machineId, 'extendedKeyUsage=clientAuth\nkeyUsage=digitalSignature\n'),
    intruder: certificate('intruder', pem(intruderKey.privateKey, true),
      'neo:machine:intruder', 'extendedKeyUsage=clientAuth\nkeyUsage=digitalSignature\n'),
  }
}

function payloadFor(id, key) {
  const payload = {
    schema:'NEO-OMARCHY-PRIVATE-004',machineId:id,action:'lease.poll',
    body:null,issuedAt:Date.now(),nonce:randomBytes(32).toString('hex'),
  }
  return {
    payload,
    signature:sign(null,Buffer.from(JSON.stringify(canonical(payload))),key)
      .toString('base64url'),
  }
}

function httpsPost({ port, ca, credential, envelope, servername='coordinator.neo.internal' }) {
  return new Promise((resolve, reject) => {
    const input = JSON.stringify(envelope)
    const req=request({
      host:'127.0.0.1',port,servername,method:'POST',
      path:'/private/v1/worker',ca,
      key:credential?.key,cert:credential?.cert,
      rejectUnauthorized:true,timeout:3_000,
      headers:{'content-type':'application/json',
        'content-length':Buffer.byteLength(input)},
    },res=>{
      let raw=''
      res.on('data',chunk=>{raw+=chunk})
      res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(raw)}))
    })
    req.on('error',reject)
    req.on('timeout',()=>req.destroy(new Error('client_timeout')))
    req.end(input)
  })
}

test('TLS 1.3 CA trust is NOT enough: mTLS key must match NEOpass-enrolled machine key', {
  timeout:15_000,
},async()=>{
  const fixtures=generateTlsFixtures()
  let allowed=true
  let executed=0
  const trustedKey=createPublicKey(pem(machineKey.publicKey))
  const trustStore={
    machinePublicKey:async id=>{
      if (!allowed || id!==machineId) throw new Error('machine_not_authorized')
      return trustedKey
    },
    consumeMachineNonce:async()=>true,
    consumeOperatorNonce:async()=>true,
  }
  const leases={
    leaseNext:async()=>{executed++;return null},
    complete:async()=>{throw new Error('unexpected_receipt')},
    enqueue:async()=>{},revoke:async()=>{},
  }
  const coordinator=createOmarchyStagingCoordinator({
    leases,trustStore,serverPrivateKeyPem:pem(signingKey.privateKey,true),
    verifyOperatorApproval:async()=>({verified:false}),
  })
  const server=createBoundMtlsPilot({
    coordinator,trustStore,serverKeyPem:fixtures.server.key,
    serverCertPem:fixtures.server.cert,clientCaPem:fixtures.ca,
  })
  let started=false
  try {
    const bound=await server.start()
    started=true
    assert.equal(bound.host,'127.0.0.1')
    assert.equal(bound.tls,'TLSv1.3')
    assert.equal(bound.productionReady,false)
    const valid=await httpsPost({
      port:bound.port,ca:fixtures.ca,credential:fixtures.device,
      envelope:payloadFor(machineId,machineKey.privateKey),
    })
    assert.equal(valid.status,200)
    assert.equal(valid.body.payload.machineId,machineId)
    assert.equal(executed,1)

    // Another certificate signed by the SAME CA cannot use the enrolled key.
    const wrongClient=await httpsPost({
      port:bound.port,ca:fixtures.ca,credential:fixtures.intruder,
      envelope:payloadFor(machineId,machineKey.privateKey),
    })
    assert.equal(wrongClient.status,403)
    assert.equal(executed,1)

    // Even a correctly certified machine must sign its app payload with its key.
    const wrongAppSignature=await httpsPost({
      port:bound.port,ca:fixtures.ca,credential:fixtures.device,
      envelope:payloadFor(machineId,intruderKey.privateKey),
    })
    assert.equal(wrongAppSignature.status,403)
    assert.equal(executed,1)

    allowed=false
    const revoked=await httpsPost({
      port:bound.port,ca:fixtures.ca,credential:fixtures.device,
      envelope:payloadFor(machineId,machineKey.privateKey),
    })
    assert.equal(revoked.status,403)
    assert.equal(executed,1)

    await assert.rejects(httpsPost({
      port:bound.port,ca:fixtures.ca,credential:null,
      envelope:payloadFor(machineId,machineKey.privateKey),
    }))
    await assert.rejects(httpsPost({
      port:bound.port,ca:fixtures.ca,credential:fixtures.device,
      envelope:payloadFor(machineId,machineKey.privateKey),
      servername:'wrong.neo.internal',
    }))
    assert.equal(executed,1)
  } finally {
    if (started) await server.stop()
    rmSync(fixtures.dir,{recursive:true,force:true})
  }
})

test('a signed staging audit snapshot is verifiable but not a witness or chain anchor',async()=>{
  const signerKeys=generateKeyPairSync('ed25519')
  const pool={
    query:async()=>({rows:[
      {seq:'1',kind:'machine.challenge_006',subject_id:machineId,
        metadata_json:{scope:'local-inference'},
        previous_hash:'0'.repeat(64),event_hash:'a'.repeat(64)},
      {seq:'2',kind:'machine.enrolled_006',subject_id:machineId,
        metadata_json:{reviewed:true},
        previous_hash:'a'.repeat(64),event_hash:'b'.repeat(64)},
    ]}),
  }
  const commitment=await createStagingAuditCommitment({
    pool,signerId:'neo:auditor:ci',signerKeyId:'ci-witness-key',
    signingKeyPem:pem(signerKeys.privateKey,true),
  })
  const config={publicKeyPem:pem(signerKeys.publicKey),
    signerId:'neo:auditor:ci',signerKeyId:'ci-witness-key'}
  assert.equal(verifyStagingAuditCommitment({commitment,...config}),true)
  assert.equal(commitment.payload.independentlyWitnessed,false)
  assert.equal(commitment.payload.sourceEventHashesRecomputed,false)
  assert.equal(commitment.payload.blockchainAnchorVerified,false)
  assert.equal(verifyStagingAuditCommitment({
    commitment:{...commitment,payload:{...commitment.payload,eventCount:500}},
    ...config,
  }),false)
  await assert.rejects(createStagingAuditCommitment({
    pool:{query:async()=>({rows:[
      {seq:1,kind:'x',subject_id:'x',metadata_json:{},
        previous_hash:'0'.repeat(64),event_hash:'a'.repeat(64)},
      {seq:2,kind:'x',subject_id:'x',metadata_json:{},
        previous_hash:'f'.repeat(64),event_hash:'b'.repeat(64)},
    ]})},
    signerId:'neo:auditor:ci',signerKeyId:'ci-witness-key',
    signingKeyPem:pem(signerKeys.privateKey,true),
  }),/audit_linkage_invalid/)
})
