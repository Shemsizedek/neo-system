import test from 'node:test'
import assert from 'node:assert/strict'
import {loadPolicy,loadProgram,deriveWorkPackages,renderIssue,buildSelfDevelopmentReport} from './neo-self-development.mjs'

test('Gate 105 derives autonomous work only from governed high-priority gaps',()=>{
  const policy=loadPolicy(), program=loadProgram()
  const work=deriveWorkPackages(program,policy)
  assert.ok(work.length>0)
  assert.ok(work.every(x=>['P0','P1'].includes(x.priority)))
  assert.ok(work.every(x=>['NOT_ASSESSED','NOT_BUILT','PLANNED','IN_PROGRESS','PARTIAL','BLOCKED'].includes(x.implementation_status)))
})

test('self-development issues carry deterministic de-duplication markers',()=>{
  const pkg=deriveWorkPackages(loadProgram(),loadPolicy())[0]
  const issue=renderIssue(pkg)
  assert.match(issue.body,new RegExp(`neo-selfdev:${pkg.requirement_id}`))
  assert.match(issue.body,/Autonomy boundary/)
})

test('self-development policy does not grant merge or production deployment autonomy',()=>{
  const policy=loadPolicy()
  assert.equal(policy.autonomy.may_auto_create_issue,true)
  assert.equal(policy.autonomy.may_auto_commit_code,false)
  assert.equal(policy.autonomy.may_auto_merge_pull_request,false)
  assert.equal(policy.autonomy.may_auto_deploy_production,false)
})

test('report exposes work packages for command-center consumption',()=>{
  const report=buildSelfDevelopmentReport(loadProgram(),loadPolicy())
  assert.equal(report.gate,105)
  assert.equal(report.summary.work_packages,report.work_packages.length)
  assert.ok(report.work_packages.every(x=>x.acceptance_criteria.length>=3))
})
