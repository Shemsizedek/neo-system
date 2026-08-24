const clamp=(n,min,max)=>Math.max(min,Math.min(max,n))

export function minerScore(miner,{electricityUsdPerKwh=0.08,contractPriority=1}={}){
  const hashrate=Math.max(0,Number(miner.hashrateTh)||0)
  const powerW=Math.max(0,Number(miner.powerW)||0)
  const efficiency=hashrate>0?powerW/hashrate:999
  const uptime=clamp(Number(miner.uptimePct)||0,0,100)
  const temp=Number(miner.tempC)||0
  const rejected=clamp(Number(miner.rejectedSharePct)||0,0,100)
  const energyCostPerHour=(powerW/1000)*electricityUsdPerKwh
  const thermalPenalty=temp>=85?40:temp>=78?20:temp>=72?8:0
  const rejectPenalty=rejected*3
  const statusPenalty=miner.status==='OFFLINE'||miner.status==='CRITICAL'?100:miner.status==='WARNING'?10:0
  const efficiencyScore=clamp(100-(efficiency-15)*2.5,0,100)
  const healthScore=clamp(uptime-thermalPenalty-rejectPenalty-statusPenalty,0,100)
  const priorityBoost=clamp(contractPriority,0,5)*4
  const score=clamp((efficiencyScore*0.42)+(healthScore*0.43)+(clamp(hashrate/2,0,100)*0.15)+priorityBoost,0,100)
  return {score,efficiencyJTh:efficiency,healthScore,energyCostPerHour,eligible:statusPenalty<100&&hashrate>0}
}

export function optimizeHashpower({miners,contracts=[],electricityUsdPerKwh=0.08,reservePct=7}){
  const ranked=miners.map(miner=>({miner,...minerScore(miner,{electricityUsdPerKwh})}))
    .filter(x=>x.eligible)
    .sort((a,b)=>b.score-a.score||a.efficiencyJTh-b.efficiencyJTh)

  const totalHashrateTh=ranked.reduce((sum,x)=>sum+x.miner.hashrateTh,0)
  const reserveTargetTh=totalHashrateTh*(reservePct/100)
  let usableTh=Math.max(0,totalHashrateTh-reserveTargetTh)
  const allocations=[]

  const orderedContracts=[...contracts].sort((a,b)=>(b.priority||0)-(a.priority||0)||new Date(a.startsAt||0)-new Date(b.startsAt||0))
  for(const contract of orderedContracts){
    let remaining=Math.max(0,Number(contract.targetHashrateTh)||0)
    const sources=[]
    for(const row of ranked){
      if(remaining<=0||usableTh<=0) break
      const already=allocations.reduce((sum,a)=>sum+(a.sources.find(s=>s.minerId===row.miner.id)?.hashrateTh||0),0)
      const available=Math.max(0,row.miner.hashrateTh-already)
      if(!available) continue
      const take=Math.min(available,remaining,usableTh)
      if(take>0){
        sources.push({minerId:row.miner.id,hashrateTh:take,score:Number(row.score.toFixed(2)),efficiencyJTh:Number(row.efficiencyJTh.toFixed(2))})
        remaining-=take
        usableTh-=take
      }
    }
    const delivered=(Number(contract.targetHashrateTh)||0)-remaining
    allocations.push({contractId:contract.id,targetHashrateTh:Number(contract.targetHashrateTh)||0,allocatedHashrateTh:delivered,coveragePct:contract.targetHashrateTh?clamp((delivered/contract.targetHashrateTh)*100,0,100):0,status:remaining<=0?'FULL':'PARTIAL',sources})
  }

  return {
    generatedAt:new Date().toISOString(),
    totalHashrateTh,
    reserveTargetTh,
    unallocatedUsableTh:usableTh,
    rankedMiners:ranked.map(x=>({minerId:x.miner.id,score:Number(x.score.toFixed(2)),efficiencyJTh:Number(x.efficiencyJTh.toFixed(2)),healthScore:Number(x.healthScore.toFixed(2)),energyCostPerHour:Number(x.energyCostPerHour.toFixed(4))})),
    allocations
  }
}

export function recommendOperatingMode(miner,{electricityUsdPerKwh=0.08,thermalLimitC=80}={}){
  const s=minerScore(miner,{electricityUsdPerKwh})
  if(!s.eligible) return 'STANDBY'
  if((miner.tempC||0)>=thermalLimitC) return 'LOW_POWER'
  if(s.efficiencyJTh<=20&&s.healthScore>=95) return 'PERFORMANCE'
  if(s.efficiencyJTh<=28&&s.healthScore>=85) return 'BALANCED'
  return 'EFFICIENCY'
}

export function choosePool(pools,{maxFeePct=3,maxLatencyMs=250}={}){
  const eligible=pools.filter(p=>p.enabled&&p.status==='ONLINE'&&(p.feePct??99)<=maxFeePct&&(p.latencyMs??9999)<=maxLatencyMs)
  if(!eligible.length) return null
  return [...eligible].sort((a,b)=>(a.feePct-b.feePct)||(a.latencyMs-b.latencyMs)||(b.acceptedSharePct-a.acceptedSharePct))[0]
}
