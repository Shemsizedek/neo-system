import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {pathToFileURL} from 'node:url'

const ROOT=process.cwd()
export const POLICY_PATH='architecture/neo-operational-learning-policy.json'
export const MEMORY_PATH='data/neo-operational-experience.jsonl'

const readJson=(root,p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))
export const loadPolicy=(root=ROOT)=>readJson(root,POLICY_PATH)

const stableHash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')

export function normalizeExperience(input={}){
  const type=String(input.type||'').toUpperCase()
  if(!type) throw new TypeError('experience type required')
  const service=String(input.service||'unknown')
  const observed_at=input.observed_at||new Date().toISOString()
  const fingerprint=stableHash({
    type,
    service,
    failure_class:input.failure_class||null,
    code:input.code||null,
    action:input.action||null,
    version:input.version||null
  }).slice(0,24)
  return {
    experience_id:input.experience_id||`EXP-${fingerprint}-${Date.parse(observed_at)||Date.now()}`,
    type,
    service,
    observed_at,
    failure_class:input.failure_class||null,
    code:input.code||null,
    action:input.action||null,
    outcome:input.outcome||'UNKNOWN',
    version:input.version||null,
    source_refs:Array.isArray(input.source_refs)?input.source_refs:[],
    evidence_refs:Array.isArray(input.evidence_refs)?input.evidence_refs:[],
    fingerprint,
    confidence:input.confidence??null
  }
}

export function appendExperience(experience,{root=ROOT}={}){
  const record=normalizeExperience(experience)
  const target=path.join(root,MEMORY_PATH)
  fs.mkdirSync(path.dirname(target),{recursive:true})
  fs.appendFileSync(target,JSON.stringify(record)+'\n')
  return record
}

export function loadExperiences({root=ROOT}={}){
  const target=path.join(root,MEMORY_PATH)
  if(!fs.existsSync(target)) return []
  return fs.readFileSync(target,'utf8').split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line))
}

export function detectPatterns(records,policy=loadPolicy()){
  const groups=new Map()
  for(const record of records){
    const key=record.fingerprint||normalizeExperience(record).fingerprint
    const list=groups.get(key)||[]
    list.push(record)
    groups.set(key,list)
  }
  const threshold=policy.confidence.minimum_recurrence_for_pattern||3
  return [...groups.entries()]
    .filter(([,items])=>items.length>=threshold)
    .map(([fingerprint,items])=>{
      const successes=items.filter(x=>x.outcome==='SUCCESS').length
      const failures=items.filter(x=>x.outcome==='FAILURE').length
      return {
        pattern_id:`PAT-${fingerprint}`,
        fingerprint,
        occurrences:items.length,
        successes,
        failures,
        first_seen:items.map(x=>x.observed_at).sort()[0],
        last_seen:items.map(x=>x.observed_at).sort().at(-1),
        sample:items.at(-1),
        confidence:Math.min(0.99,0.5+Math.log10(items.length+1)/2)
      }
    })
    .sort((a,b)=>b.occurrences-a.occurrences)
}

export function rankRunbookEvidence(records,policy=loadPolicy()){
  const map=new Map()
  for(const r of records){
    if(!r.action) continue
    const row=map.get(r.action)||{action:r.action,attempts:0,successes:0,failures:0}
    row.attempts++
    if(r.outcome==='SUCCESS') row.successes++
    if(r.outcome==='FAILURE') row.failures++
    map.set(r.action,row)
  }
  return [...map.values()].map(row=>{
    const success_rate=row.attempts?row.successes/row.attempts:null
    let recommendation='INSUFFICIENT_EVIDENCE'
    if(row.successes>=policy.confidence.minimum_successes_for_runbook_trust) recommendation='TRUST_INCREASE_CANDIDATE'
    if(row.failures>=policy.confidence.minimum_failures_for_runbook_review) recommendation='REVIEW_REQUIRED'
    return {...row,success_rate,recommendation}
  }).sort((a,b)=>b.attempts-a.attempts)
}

export function generateLessons(records,policy=loadPolicy()){
  const patterns=detectPatterns(records,policy)
  const runbooks=rankRunbookEvidence(records,policy)
  const lessons=[]
  for(const p of patterns){
    lessons.push({
      lesson_id:`LESSON-${p.fingerprint}`,
      kind:'RECURRENCE',
      statement:`${p.sample.type} recurred ${p.occurrences} times for ${p.sample.service}.`,
      evidence:{pattern_id:p.pattern_id,occurrences:p.occurrences,first_seen:p.first_seen,last_seen:p.last_seen},
      confidence:p.confidence,
      policy_effect:'RECOMMEND_ONLY'
    })
  }
  for(const r of runbooks.filter(x=>x.recommendation!=='INSUFFICIENT_EVIDENCE')){
    lessons.push({
      lesson_id:`LESSON-RUNBOOK-${stableHash(r.action).slice(0,16)}`,
      kind:'RUNBOOK_PERFORMANCE',
      statement:`${r.action} has ${r.successes} successes and ${r.failures} failures across ${r.attempts} recorded attempts.`,
      evidence:r,
      confidence:r.attempts?Math.min(0.99,r.attempts/10):0,
      policy_effect:'RECOMMEND_ONLY',
      recommendation:r.recommendation
    })
  }
  return lessons
}

export function generatePolicyRecommendations(lessons){
  return lessons.map(lesson=>({
    recommendation_id:`REC-${lesson.lesson_id}`,
    source_lesson:lesson.lesson_id,
    change_class:lesson.kind==='RUNBOOK_PERFORMANCE'?'RECOVERY_POLICY':'OPERATIONS',
    recommendation:
      lesson.kind==='RUNBOOK_PERFORMANCE' && lesson.recommendation==='REVIEW_REQUIRED'
        ? 'Review the affected recovery runbook before allowing broader autonomy.'
        : lesson.kind==='RUNBOOK_PERFORMANCE' && lesson.recommendation==='TRUST_INCREASE_CANDIDATE'
          ? 'Consider increasing trust only after controlled validation confirms the observed success rate.'
          : 'Investigate the recurring condition and consider a targeted test, fix, or runbook update.',
    auto_apply:false,
    status:'PROPOSED'
  }))
}

export function buildLearningReport(records,policy=loadPolicy()){
  const patterns=detectPatterns(records,policy)
  const runbooks=rankRunbookEvidence(records,policy)
  const lessons=generateLessons(records,policy)
  return {
    gate:106,
    generated_at:new Date().toISOString(),
    summary:{experiences:records.length,patterns:patterns.length,lessons:lessons.length,recommendations:lessons.length},
    patterns,
    runbook_evidence:runbooks,
    lessons,
    recommendations:generatePolicyRecommendations(lessons),
    policy_mutated:false
  }
}

export function writeLearningReport(report,output='artifacts/implementation/gate-106-operational-learning.json',root=ROOT){
  const target=path.join(root,output)
  fs.mkdirSync(path.dirname(target),{recursive:true})
  fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n')
  return target
}

function ingestFromEnv(){
  if(!process.env.NEO_EXPERIENCE) return null
  return appendExperience(JSON.parse(process.env.NEO_EXPERIENCE))
}

function main(){
  const args=new Set(process.argv.slice(2))
  const ingested=args.has('--ingest')?ingestFromEnv():null
  const report=buildLearningReport(loadExperiences())
  if(args.has('--write')) writeLearningReport(report)
  process.stdout.write(JSON.stringify({ingested,report},null,2)+'\n')
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) main()
