export function evaluateHealth(telemetry,{maxTempC=85,minHashrateTh=1,maxRejectPct=5}={}){
  const accepted=Math.max(0,Number(telemetry.acceptedShares||0))
  const rejected=Math.max(0,Number(telemetry.rejectedShares||0))
  const total=accepted+rejected
  const rejectPct=total?rejected/total*100:0
  const issues=[]
  if(Number(telemetry.temperatureC||0)>maxTempC) issues.push('HIGH_TEMPERATURE')
  if(Number(telemetry.hashrateTh||0)<minHashrateTh) issues.push('LOW_HASHRATE')
  if(rejectPct>maxRejectPct) issues.push('HIGH_REJECT_RATE')
  const score=Math.max(0,100-(issues.includes('HIGH_TEMPERATURE')?35:0)-(issues.includes('LOW_HASHRATE')?45:0)-(issues.includes('HIGH_REJECT_RATE')?20:0))
  return {score,status:issues.length?'DEGRADED':'HEALTHY',issues,rejectPct}
}

export async function safeControl(adapter,command){
  if(command==='PROBE') return adapter.probe?.()||{ok:true}
  if(command==='RESTART'){
    if(typeof adapter.restart!=='function') throw new Error('Adapter does not support restart')
    return adapter.restart()
  }
  throw new Error(`Unsupported control command: ${command}`)
}
