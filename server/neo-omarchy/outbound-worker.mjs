// NEO-OMARCHY-003: transport-neutral outbound-only worker protocol.
// No listener or task interpreter; only a pre-approved local-inference callback.
import { createHash } from 'node:crypto'

const MACHINE_ID = /^neo:machine:[a-z0-9][a-z0-9-]{0,63}$/
const TASK_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/
const HEX64 = /^[a-f0-9]{64}$/i

export function validateLease(machineId, lease, currentTime) {
  if (!lease || typeof lease !== 'object' || Array.isArray(lease)) return false
  if (Object.keys(lease).some(k => !['machineId', 'leaseToken', 'expiresAt', 'task'].includes(k))) return false
  if (lease.machineId !== machineId || !HEX64.test(lease.leaseToken || '')) return false
  if (!Number.isSafeInteger(lease.expiresAt) || lease.expiresAt <= currentTime ||
      lease.expiresAt - currentTime > 30_000) return false
  const task = lease.task
  if (!task || typeof task !== 'object' || Array.isArray(task)) return false
  if (Object.keys(task).some(k => !['taskId', 'capability', 'objective', 'maxTokens'].includes(k))) return false
  return TASK_ID.test(task.taskId || '') && task.capability === 'local-inference' &&
    typeof task.objective === 'string' && task.objective.trim().length > 0 &&
    task.objective.length <= 2000 && Number.isInteger(task.maxTokens) &&
    task.maxTokens > 0 && task.maxTokens <= 512
}

const digest = text => createHash('sha256').update(text).digest('hex')

export function createOutboundOmarchyWorker({
  machineId, pollLease, invokeLocalInference, submitReceipt, now = () => Date.now(),
} = {}) {
  if (!MACHINE_ID.test(machineId || '') ||
      ![pollLease, invokeLocalInference, submitReceipt].every(fn => typeof fn === 'function')) {
    throw new Error('worker_requires_scoped_transport')
  }
  let busy = false
  return {
    // This method makes outbound calls through injected scoped transports.
    // It exposes no HTTP port, shell executor, browser agent, remote plugin or wallet.
    async runOnce() {
      if (busy) throw new Error('worker_busy')
      busy = true
      try {
        const lease = await pollLease({ machineId })
        if (lease === null) return { status: 'idle' }
        if (!validateLease(machineId, lease, now())) throw new Error('untrusted_lease_rejected')
        let outcome = 'completed'
        let resultDigest
        try {
          const result = await invokeLocalInference({
            objective: lease.task.objective,
            maxTokens: lease.task.maxTokens,
            capability: 'local-inference',
          })
          if (typeof result?.text !== 'string' || !result.text.trim()) throw new Error('invalid_local_inference')
          resultDigest = digest(result.text)
        } catch {
          outcome = 'failed'
          resultDigest = digest('NEO-OMARCHY-003:local-inference-failed')
        }
        // Never send model outputs, prompts, credentials or tool authorization as a receipt.
        const response = await submitReceipt({
          machineId, taskId: lease.task.taskId,
          leaseToken: lease.leaseToken,
          outcome, resultDigest,
        })
        if (response?.taskId !== lease.task.taskId || response?.state !== outcome) {
          throw new Error('receipt_not_accepted')
        }
        return { taskId: lease.task.taskId, status: outcome, receiptRecorded: true }
      } finally {
        busy = false
      }
    },
  }
}
