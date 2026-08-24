export const SafetyState={NORMAL:'NORMAL',WARNING:'WARNING',THROTTLE:'THROTTLE',CRITICAL:'CRITICAL',SHUTDOWN_REQUIRED:'SHUTDOWN_REQUIRED',LATCHED:'LATCHED'}

export function zoneState(tempC,policy={warningC:75,throttleC:82,criticalC:90,emergencyC:95}){
  if(tempC>=policy.emergencyC) return 'EMERGENCY'
  if(tempC>=policy.criticalC) return 'CRITICAL'
  if(tempC>=policy.throttleC) return 'THROTTLE'
  if(tempC>=policy.warningC) return 'WARNING'
  return 'NORMAL'
}

export function evaluateSafety(telemetry,policy={warningC:75,throttleC:82,criticalC:90,emergencyC:95}){
  const zones=(telemetry.thermal_zones||[]).map(z=>({...z,state:zoneState(Number(z.temperature_c||0),policy)}))
  const states=new Set(zones.map(z=>z.state))
  const hardFault=Boolean(telemetry.leak_detect)||Boolean(telemetry.overcurrent)||Boolean(telemetry.dc_bus_fault)||Boolean(telemetry.cooling_failure)
  let safetyState=SafetyState.NORMAL
  let action='NONE'
  if(hardFault||states.has('EMERGENCY')){safetyState=SafetyState.SHUTDOWN_REQUIRED;action='REQUEST_SAFE_POWER_OFF'}
  else if(states.has('CRITICAL')){safetyState=SafetyState.CRITICAL;action='REQUEST_THROTTLE_MAX'}
  else if(states.has('THROTTLE')){safetyState=SafetyState.THROTTLE;action='REQUEST_THROTTLE'}
  else if(states.has('WARNING')){safetyState=SafetyState.WARNING;action='INCREASE_COOLING'}
  return {safetyState,action,zones,hardFault}
}

export function economicsFromPower({powerW=0,deliveredHashrateTh=0,electricityRatePerKwh=0,coolingOverheadW=0,facilityOverheadW=0,btcProduced=0,hours=1}={}){
  const totalW=Math.max(0,Number(powerW)+Number(coolingOverheadW)+Number(facilityOverheadW))
  const kwh=totalW/1000*Math.max(0,Number(hours))
  const cost=kwh*Math.max(0,Number(electricityRatePerKwh))
  const jPerTh=deliveredHashrateTh>0?Number(powerW)/Number(deliveredHashrateTh):0
  return {
    totalPowerW:totalW,
    energyKwh:kwh,
    electricityCost:cost,
    electricityCostPerHour:hours>0?cost/hours:0,
    jPerTh,
    electricityCostPerTh:deliveredHashrateTh>0?cost/deliveredHashrateTh:0,
    electricityCostPerBtc:btcProduced>0?cost/btcProduced:null
  }
}

export function coolingFailSafe({fanTach=[],pumpRequired=false,pumpStatus='OK',leakDetect=false}={}){
  if(leakDetect) return {ok:false,reason:'LEAK_DETECTED',action:'REQUEST_SAFE_POWER_OFF'}
  if(pumpRequired&&pumpStatus!=='OK') return {ok:false,reason:'PUMP_FAILURE',action:'REQUEST_SAFE_POWER_OFF'}
  if(fanTach.length&&fanTach.some(rpm=>Number(rpm)<=0)) return {ok:false,reason:'FAN_FAILURE',action:'INCREASE_COOLING_OR_THROTTLE'}
  return {ok:true,reason:'COOLING_OK',action:'NONE'}
}
