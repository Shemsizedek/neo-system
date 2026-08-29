import test from 'node:test'
import assert from 'node:assert/strict'
import {buildRemoteLockout,evaluateHeartbeat,hardwareCapabilities,normalizeDeviceRegistration} from './hardware.mjs'

test('registers vendor-neutral ATM hardware components',()=>{
  const record=normalizeDeviceRegistration({deviceId:'NT-ATM-001',manufacturer:'ExampleVendor',model:'X1',serialNumber:'SN-1',components:[{type:'CASH_DISPENSER',model:'CD-1'},{type:'NFC_READER',model:'NFC-1'}]})
  assert.equal(record.vendorNeutral,true)
  assert.equal(record.components.length,2)
  assert.equal(record.registrationHash.length,64)
})

test('heartbeat locks device when tamper is detected',()=>{
  const result=evaluateHeartbeat({deviceId:'NT-ATM-001',tamperDetected:true,componentStates:[{id:'cash',status:'ONLINE'}]})
  assert.equal(result.status,'LOCKED')
  assert.equal(result.remoteTransactionsAllowed,false)
})

test('heartbeat degrades on component fault',()=>{
  const result=evaluateHeartbeat({deviceId:'NT-ATM-001',componentStates:[{id:'printer',status:'DEGRADED'}]})
  assert.equal(result.status,'DEGRADED')
})

test('remote lockout requires explicit confirmation and cannot remotely unlock',()=>{
  assert.throws(()=>buildRemoteLockout({deviceId:'NT-ATM-001',reason:'service',confirmation:'NO'}),/EXPLICIT_LOCKOUT_CONFIRMATION_REQUIRED/)
  const cmd=buildRemoteLockout({deviceId:'NT-ATM-001',reason:'cash variance',confirmation:'LOCK_DEVICE'})
  assert.equal(cmd.command,'LOCK_TRANSACTIONS')
  assert.equal(cmd.requiresLocalServiceToUnlock,true)
  assert.equal(hardwareCapabilities().remoteUnlock,false)
})
