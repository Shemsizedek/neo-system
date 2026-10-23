import { createCareerTask, createAwardProposal } from './contracts.mjs'

/** Deterministic in-memory staging registry. No persistence, payment, or signing. */
export function createCareersRegistry() {
  const tasks = new Map()
  const applications = new Map()
  const awards = new Map()
  const visibleTask = task => ({ ...task, compensation:{...task.compensation} })
  return Object.freeze({
    postDraft(input) {
      const task = createCareerTask(input)
      if(tasks.has(task.id)) throw new Error('duplicate task')
      tasks.set(task.id,task)
      return visibleTask(task)
    },
    listDrafts() { return [...tasks.values()].map(visibleTask) },
    apply({taskId,contributorId}) {
      if(!tasks.has(taskId)) throw new Error('unknown task')
      if(typeof contributorId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(contributorId)) throw new TypeError('invalid contributor')
      const key=taskId+':'+contributorId
      if(applications.has(key)) throw new Error('duplicate application')
      const application=Object.freeze({taskId,contributorId,state:'submitted',workAuthorized:false})
      applications.set(key,application)
      return application
    },
    proposeAward(input) {
      if(!tasks.has(input.taskId)) throw new Error('unknown task')
      if(!applications.has(input.taskId+':'+input.contributorId)) throw new Error('application required')
      const proposal=createAwardProposal(input)
      if(awards.has(proposal.receipt)) throw new Error('duplicate award proposal')
      awards.set(proposal.receipt,proposal)
      return proposal
    },
    listAwards() {return [...awards.values()]},
    capabilities() {return {mode:'review-only',publicJobsEnabled:false,hiringEnabled:false,transfersEnabled:false,ledgerPersistence:false}}
  })
}
