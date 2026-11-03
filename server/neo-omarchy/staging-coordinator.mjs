// NEO-OMARCHY-005: authenticated loopback staging coordinator.
// Never deploy this plain HTTP lab server beyond 127.0.0.1.
// A future private TLS/mTLS reverse proxy and trusted NEOpass enrollment are separate.
import { createServer } from 'node:http'
import { createPrivateKey, sign, verify } from 'node:crypto'

const MACHINE = /^neo:machine:[a-z0-9][a-z0-9-]{0,63}$/
const HEX64 = /^[a-f0-9]{64}$/i
const TASK = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const B64URL = /^[A-Za-z0-9_-]+$/
const keys = (item,names) => item && typeof item==='object' && !Array.isArray(item) &&
  Object.keys(item).sort().join(',') === [...names].sort().join(',')
const canonical = v => Array.isArray(v) ? v.map(canonical) :
  v && typeof v==='object' ? Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])) : v
const wire = v => Buffer.from(JSON.stringify(canonical(v)))
function nowMs(fn) {
  const time = fn()
  if (!Number.isSafeInteger(time) || time<=0) throw new Error('invalid_clock')
  return time
}

export function createOmarchyStagingCoordinator({
  leases, trustStore, verifyOperatorApproval, serverPrivateKeyPem,
  now = () => Date.now(),
}={}) {
  if (!leases || !['leaseNext','complete','enqueue','revoke'].every(x=>typeof leases[x]==='function') ||
      !trustStore || !['machinePublicKey','consumeMachineNonce','consumeOperatorNonce'].every(x=>typeof trustStore[x]==='function') ||
      typeof verifyOperatorApproval!=='function') throw new Error('staging_dependencies_missing')
  let serverKey
  try {
    serverKey = createPrivateKey(serverPrivateKeyPem)
    if (serverKey.asymmetricKeyType!=='ed25519') throw new Error('wrong_key')
  } catch {throw new Error('pinned_coordinator_signing_key_required')}

  async function authorizedDecision(envelope,action,target,scope) {
    const decision=await verifyOperatorApproval(envelope,{action,target})
    if (decision?.verified!==true || decision.scope!==scope ||
        decision.action!==action || decision.target!==target ||
        !HEX64.test(decision.nonce || '')) throw new Error('operator_approval_rejected')
    if (!await trustStore.consumeOperatorNonce({subject:decision.subject,nonce:decision.nonce})) {
      throw new Error('operator_approval_replay')
    }
    return decision
  }

  return {
    // Deliberately not exposed via HTTP; must be called only behind a
    // separately authenticated administrative path after human review.
    async queueApprovedTask({taskId,objective,maxTokens,operatorEnvelope}) {
      const decision=await authorizedDecision(operatorEnvelope,'task.queue',taskId,'omarchy:task:queue')
      return leases.enqueue({taskId,objective,maxTokens,decision})
    },
    async revokeApprovedMachine({machineId,operatorEnvelope}) {
      const decision=await authorizedDecision(operatorEnvelope,'machine.revoke',machineId,'omarchy:machine:revoke')
      return leases.revoke({machineId,decision})
    },
    async handleWorkerEnvelope(envelope) {
      if (!keys(envelope,['payload','signature']) ||
          !keys(envelope.payload,['schema','machineId','action','body','issuedAt','nonce']) ||
          typeof envelope.signature!=='string' || !B64URL.test(envelope.signature)) {
        throw new Error('machine_request_invalid')
      }
      const p=envelope.payload
      const at=nowMs(now)
      if (p.schema!=='NEO-OMARCHY-PRIVATE-004' || !MACHINE.test(p.machineId || '') ||
          !['lease.poll','lease.receipt'].includes(p.action) ||
          !HEX64.test(p.nonce || '') ||
          !Number.isSafeInteger(p.issuedAt) ||
          Math.abs(at-p.issuedAt)>10_000 ||
          (p.action==='lease.poll' && p.body!==null) ||
          (p.action==='lease.receipt' && (
            !keys(p.body,['taskId','leaseToken','outcome','resultDigest']) ||
            !TASK.test(p.body.taskId || '') || !HEX64.test(p.body.leaseToken || '') ||
            !HEX64.test(p.body.resultDigest || '') ||
            !['completed','failed'].includes(p.body.outcome)))) {
        throw new Error('machine_request_invalid')
      }
      const signature=Buffer.from(envelope.signature,'base64url')
      const publicKey=await trustStore.machinePublicKey(p.machineId)
      if (signature.length!==64 || signature.toString('base64url')!==envelope.signature ||
          !verify(null,wire(p),publicKey,signature)) throw new Error('machine_signature_invalid')
      // Consume nonce BEFORE issuing a lease or committing a receipt.
      if (!await trustStore.consumeMachineNonce({machineId:p.machineId,nonce:p.nonce})) {
        throw new Error('machine_request_replay')
      }
      const body = p.action==='lease.poll'
        ? await leases.leaseNext({machineId:p.machineId})
        : await leases.complete({machineId:p.machineId,...p.body})
      const issuedAt=nowMs(now)
      const payload={
        schema:'NEO-OMARCHY-PRIVATE-004',
        machineId:p.machineId,action:p.action,requestNonce:p.nonce,
        issuedAt,expiresAt:issuedAt+5_000,body,
      }
      return {payload,signature:sign(null,wire(payload),serverKey).toString('base64url')}
    },
  }
}

// Local testing utility only; does not start a server until start() is called.
// No reverse-proxy headers are trusted and the fixed listener is loopback-only.
export function createLoopbackOmarchyServer({coordinator}={}) {
  if (typeof coordinator?.handleWorkerEnvelope!=='function') throw new Error('coordinator_required')
  const server=createServer(async (req,res)=>{
    const json=(status,value)=>{
      res.writeHead(status,{
        'content-type':'application/json',
        'cache-control':'no-store',
        'x-content-type-options':'nosniff',
      })
      res.end(JSON.stringify(value))
    }
    if (!['127.0.0.1','::ffff:127.0.0.1','::1'].includes(req.socket?.remoteAddress)) {
      return json(403,{error:'local_only'})
    }
    if (req.method==='GET' && req.url==='/health') {
      return json(200,{gate:'NEO-OMARCHY-005',mode:'staging-local',productionReady:false})
    }
    if (req.method!=='POST'||req.url!=='/private/v1/worker') return json(404,{error:'not_found'})
    if (req.headers['content-type']!=='application/json') return json(415,{error:'content_type'})
    let length=0,body=''
    try {
      for await (const fragment of req) {
        length+=fragment.length
        if (length>8192) return json(413,{error:'request_too_large'})
        body+=fragment.toString('utf8')
      }
      const envelope=JSON.parse(body)
      return json(200,await coordinator.handleWorkerEnvelope(envelope))
    } catch {
      // No database, signature or token details leaked to the caller.
      return json(403,{error:'request_not_authorized'})
    }
  })
  server.requestTimeout=10_000
  server.headersTimeout=10_000
  return {
    async start() {
      if (server.listening) throw new Error('already_running')
      await new Promise((resolve,reject)=>{
        server.once('error',reject)
        server.listen(0,'127.0.0.1',resolve)
      })
      return {host:'127.0.0.1',port:server.address().port,productionReady:false}
    },
    stop:()=>new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve())),
  }
}
