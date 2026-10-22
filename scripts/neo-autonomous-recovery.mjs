import fs from 'node:fs'
import path from 'node:path'
import {pathToFileURL} from 'node:url'
import {
  proposeRemediation,
  simulateRemediation,
  authorizeRemediation,
  executeRemediation,
  verifyRemediation,
  decideRollback
} from '../server/neo-router/autonomous-operations.mjs'

const ROOT=process.cwd()
export const RUNBOOKS_PATH='architecture/neo-recovery-runbooks.json'
const FAILURE_CLASSES=new Set(['TRANSIENT','CONFIGURATION_DRIFT','BAD_RELEASE','DEPENDENCY_FAILURE','DATABASE_FAILURE','CREDENTIAL_FAILURE','DNS_FAILURE','CAPACITY_FAILURE','UNKNOWN'])

export function loadRunbooks(root=ROOT){
  return JSON.parse(fs.readFileSync(path.join(root,RUNBOOKS_PATH),'utf8'))
}

export function classifyFailure(signal={}){
  const code=String(signal.code||signal.error||signal.reason||'').toLowerCase()
  const status=Number(signal.http_status??signal.status)
  if(signal.release_regression===true) return 'BAD_RELEASE'
  if(signal.config_drift===true) return 'CONFIGURATION_DRIFT'
  if(signal.database_unavailable===true||/database|firestore|postgres/.test(code)) return 'DATABASE_FAILURE'
  if(signal.credential_failure===true||/credential|token|unauthorized|forbidden/.test(code)||status===401||status===403) return 'CREDENTIAL_FAILURE'
  if(signal.dns_failure===true||/dns|nxdomain|resolve/.test(code)) return 'DNS_FAILURE'
  if(signal.capacity_failure===true||status===429||/capacity|quota|rate.?limit/.test(code)) return 'CAPACITY_FAILURE'
  if(signal.dependency_failure===true||/dependency|upstream|gateway/.test(code)||[502,503,504].includes(status)) return 'DEPENDENCY_FAILURE'
  if(signal.transient===true||/timeout|temporar|connection reset|econnreset/.test(code)) return 'TRANSIENT'
  return 'UNKNOWN'
}

export function selectRunbook(config,failureClass){
  if(!FAILURE_CLASSES.has(failureClass)) throw new TypeError('invalid failure class')
  return (config.runbooks||[]).find(r=>r.failure_class===failureClass)
    || (config.runbooks||[]).find(r=>r.failure_class==='UNKNOWN')
}

export function buildRecoveryPlan({signal,service,config=loadRunbooks()}={}){
  if(!service) throw new TypeError('service required')
  const failure_class=classifyFailure(signal)
  const runbook=selectRunbook(config,failure_class)
  if(!runbook) throw new Error('runbook_not_found')
  const authority=runbook.autonomy
  return {
    gate:104,
    recovery_id:`recovery-${service}-${Date.now()}`,
    service,
    failure_class,
    runbook_id:runbook.runbook_id,
    authority,
    actions:[...runbook.actions],
    max_attempts:runbook.max_attempts,
    rollback_required:Boolean(runbook.rollback_required),
    auto_executable:authority==='AUTO_SAFE',
    escalation_required:authority!=='AUTO_SAFE',
    created_at:new Date().toISOString()
  }
}

export function authorizeRecovery(plan,{approved=false}={}){
  if(!plan) throw new TypeError('plan required')
  if(plan.failure_class==='UNKNOWN') return {...plan,status:'ESCALATE',authorized:false,reason:'unknown_failure_class'}
  if(plan.authority==='AUTO_SAFE') return {...plan,status:'AUTHORIZED',authorized:true,approved_by:'standing-safe-recovery-policy'}
  if(plan.authority==='APPROVAL_REQUIRED'&&approved) return {...plan,status:'AUTHORIZED',authorized:true,approved_by:'explicit-operator-approval'}
  return {...plan,status:'ESCALATE',authorized:false,reason:plan.authority==='APPROVAL_REQUIRED'?'approval_required':'manual_recovery_required'}
}

export function executeSafeRecovery({authorization,actionExecutor}={}){
  if(!authorization?.authorized) return {...authorization,execution:{status:'not-executed'}}
  if(authorization.authority!=='AUTO_SAFE') return {...authorization,execution:{status:'delegated-to-existing-autonomous-operations'}}
  const results=[]
  for(const action of authorization.actions){
    const result=actionExecutor?actionExecutor(action,authorization):{ok:true,action,mode:'simulated-safe-default'}
    results.push(result)
    if(result?.ok===false) break
  }
  const ok=results.every(r=>r?.ok!==false)
  return {...authorization,status:ok?'EXECUTED':'EXECUTION_FAILED',execution:{status:ok?'executed':'failed',results},executed_at:new Date().toISOString()}
}

export function buildExistingControlLoopProposal(plan,signal={}){
  const action=plan.failure_class==='BAD_RELEASE'?'rollback-deployment':plan.failure_class==='CONFIGURATION_DRIFT'?'change-routing':'investigate-reliability'
  const proposal=proposeRemediation({
    signal,
    service:plan.service,
    action,
    risk:plan.authority==='AUTO_SAFE'?'low':'high',
    target:{service:plan.service,runbook_id:plan.runbook_id}
  })
  const simulation=simulateRemediation({proposal,simulator:()=>({safe:plan.failure_class!=='UNKNOWN',expectedImpact:plan.actions.join(' -> '),confidence:plan.failure_class==='UNKNOWN'?0:0.8})})
  return {proposal,simulation}
}

export function verifyRecovery({execution,healthy}={}){
  if(!execution) throw new TypeError('execution required')
  const pseudoExecution={...execution,execution:{ok:execution.execution?.status!=='failed'}}
  return verifyRemediation({
    execution:pseudoExecution,
    before:{availability:0},
    after:{availability:healthy?1:0},
    healthMetric:'availability',
    minImprovement:1
  })
}

export function recoveryDecision({verification,rollbackAvailable=false}={}){
  return decideRollback({verification,rollbackAvailable})
}

function main(){
  const input=process.env.NEO_RECOVERY_SIGNAL?JSON.parse(process.env.NEO_RECOVERY_SIGNAL):{}
  const service=process.env.NEO_RECOVERY_SERVICE||'unknown-service'
  const plan=buildRecoveryPlan({signal:input,service})
  const authorization=authorizeRecovery(plan,{approved:process.env.NEO_RECOVERY_APPROVED==='true'})
  process.stdout.write(JSON.stringify({plan,authorization},null,2)+'\n')
  if(authorization.status==='ESCALATE') process.exitCode=2
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) main()
