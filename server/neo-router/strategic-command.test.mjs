import test from 'node:test'
import assert from 'node:assert/strict'
import { createStrategicObjective, planCampaign, scoreObjective, buildAfterActionReview, strategicDashboard } from './strategic-command.mjs'

test('builds objective and governed campaign plan',()=>{
 const objective=createStrategicObjective({id:'OBJ-1',title:'Prepare NEOpay for release',keyResults:[{id:'kr1',progress:0}]})
 const campaign=planCampaign(objective,{capacity:{software:1,operations:1,communications:1,integration:1},budget:{creditsPerMission:50}})
 assert.equal(campaign.missions.length,4)
 assert.equal(campaign.budget.credits,200)
 assert.equal(campaign.missions[1].dependencies[0],'OBJ-1-WS-01')
})

test('scores outcomes and creates after-action review',()=>{
 const objective=createStrategicObjective({id:'OBJ-2',title:'Stabilize Router',keyResults:[{id:'kr',status:'complete'}]})
 const missions=[{id:'m1',strategicObjectiveId:'OBJ-2',status:'completed',objective:'fix build'},{id:'m2',strategicObjectiveId:'OBJ-2',status:'failed',objective:'repair adapter',error:'boom'}]
 const score=scoreObjective(objective,{missions})
 assert.equal(score.completed,1)
 assert.equal(score.failed,1)
 const aar=buildAfterActionReview(objective,{missions,approvals:[{missionId:'m1'}],events:[{missionId:'m1'}]})
 assert.equal(aar.whatFailed.length,1)
 assert.ok(aar.recommendations.length>0)
 const dashboard=strategicDashboard({objectives:[objective],campaigns:[{status:'planned'}],missions})
 assert.equal(dashboard.summary.objectives,1)
})
