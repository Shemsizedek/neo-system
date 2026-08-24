function clone(v){return structuredClone(v)}
function pct(done,total){return total<=0?0:Math.max(0,Math.min(1,done/total))}

export function createStrategicObjective(input={}){
 if(!input.id||!input.title)throw new TypeError('objective id and title are required')
 return {id:input.id,title:input.title,description:input.description??'',owner:input.owner??'ORIGIN',status:input.status??'planned',targetDate:input.targetDate??null,keyResults:clone(input.keyResults??[]),budget:clone(input.budget??{}),constraints:clone(input.constraints??[]),dependencies:clone(input.dependencies??[]),createdAt:input.createdAt??new Date().toISOString()}
}

export function planCampaign(objective,{workstreams=['software','operations','communications','integration'],capacity={},budget={}}={}){
 const missions=workstreams.map((role,index)=>({id:`${objective.id}-WS-${String(index+1).padStart(2,'0')}`,objective:`Advance ${objective.title}: ${role} workstream`,workerRole:role,priority:index===0?'high':'normal',dependencies:index===0?[]:[`${objective.id}-WS-${String(index).padStart(2,'0')}`],strategicObjectiveId:objective.id,quota:{maxAttempts:3,maxActions:budget.maxActionsPerMission??20},budget:{credits:budget.creditsPerMission??100},capacityRequested:1}))
 const requested=missions.reduce((n,m)=>n+(m.capacityRequested??0),0),available=Object.values(capacity).reduce((n,v)=>n+Number(v||0),0)
 return {campaignId:`${objective.id}-CAMPAIGN`,objectiveId:objective.id,status:'planned',missions,capacity:{requested,available,feasible:available===0?true:requested<=available},budget:{credits:missions.reduce((n,m)=>n+(m.budget.credits??0),0)}}
}

export function scoreObjective(objective,{missions=[]}={}){
 const relevant=missions.filter(m=>m.strategicObjectiveId===objective.id||m.campaignId===`${objective.id}-CAMPAIGN`),completed=relevant.filter(m=>m.status==='completed').length,failed=relevant.filter(m=>m.status==='failed').length
 const kr=objective.keyResults??[],krDone=kr.filter(k=>k.status==='complete'||Number(k.progress)>=1).length
 const missionScore=pct(completed,relevant.length||1),krScore=pct(krDone,kr.length||1),penalty=Math.min(.5,failed*.1)
 return {objectiveId:objective.id,missionCompletion:missionScore,keyResultCompletion:krScore,outcomeScore:Math.max(0,Number(((missionScore*.5+krScore*.5)-penalty).toFixed(3))),completed,failed,totalMissions:relevant.length}
}

export function buildAfterActionReview(objective,{missions=[],events=[],approvals=[]}={}){
 const score=scoreObjective(objective,{missions}),relevant=missions.filter(m=>m.strategicObjectiveId===objective.id||m.campaignId===`${objective.id}-CAMPAIGN`)
 return {objectiveId:objective.id,title:objective.title,outcomeScore:score.outcomeScore,whatWorked:relevant.filter(m=>m.status==='completed').map(m=>m.objective),whatFailed:relevant.filter(m=>m.status==='failed').map(m=>({missionId:m.id,error:m.error??'unknown'})),approvalLoad:approvals.filter(a=>relevant.some(m=>m.id===a.missionId)).length,eventCount:events.filter(e=>relevant.some(m=>m.id===e.missionId)).length,recommendations:score.failed>0?['Review failed workstreams and retry policy','Rebalance capacity before the next campaign']:['Preserve successful routing and governance patterns']}
}

export function strategicDashboard({objectives=[],campaigns=[],missions=[],capacity={},budgets={}}={}){
 const scored=objectives.map(o=>scoreObjective(o,{missions}));return {summary:{objectives:objectives.length,activeCampaigns:campaigns.filter(c=>c.status!=='completed').length,avgOutcomeScore:scored.length?Number((scored.reduce((n,s)=>n+s.outcomeScore,0)/scored.length).toFixed(3)):0},objectives:objectives.map(o=>({...clone(o),score:scored.find(s=>s.objectiveId===o.id)})),campaigns:clone(campaigns),capacity:clone(capacity),budgets:clone(budgets)}
}
