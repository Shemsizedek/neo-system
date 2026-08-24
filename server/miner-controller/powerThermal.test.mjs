import test from 'node:test'
import assert from 'node:assert/strict'
import {coolingFailSafe,economicsFromPower,evaluateSafety,zoneState} from './powerThermal.mjs'

test('zoneState escalates at policy thresholds',()=>{
  assert.equal(zoneState(70),'NORMAL')
  assert.equal(zoneState(76),'WARNING')
  assert.equal(zoneState(84),'THROTTLE')
  assert.equal(zoneState(91),'CRITICAL')
  assert.equal(zoneState(96),'EMERGENCY')
})

test('hard fault requests safe power off',()=>{
  const result=evaluateSafety({thermal_zones:[{zone:'HASHBOARD_A',temperature_c:70}],overcurrent:true})
  assert.equal(result.safetyState,'SHUTDOWN_REQUIRED')
  assert.equal(result.action,'REQUEST_SAFE_POWER_OFF')
})

test('economics derives energy cost and j per th',()=>{
  const result=economicsFromPower({powerW:3000,coolingOverheadW:300,facilityOverheadW:200,deliveredHashrateTh:120,electricityRatePerKwh:.08,hours:1})
  assert.equal(result.totalPowerW,3500)
  assert.equal(result.energyKwh,3.5)
  assert.equal(result.electricityCost,.28)
  assert.equal(result.jPerTh,25)
})

test('cooling fail-safe catches pump and fan failures',()=>{
  assert.equal(coolingFailSafe({pumpRequired:true,pumpStatus:'FAILED'}).ok,false)
  assert.equal(coolingFailSafe({fanTach:[5200,0,5100]}).reason,'FAN_FAILURE')
})
