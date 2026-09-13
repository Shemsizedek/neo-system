import test from 'node:test'
import assert from 'node:assert/strict'
import { buildLinuxObservation, detectSensitiveCapture, sanitizeLinuxTelemetry } from './linuxTelemetry.mjs'

test('linux telemetry preserves defensive metadata',()=>{
  const telemetry=sanitizeLinuxTelemetry({processName:'sshd',processId:144,binaryHash:'abc',remoteAddress:'127.0.0.1',eventType:'network',severity:'low'})
  assert.equal(telemetry.processName,'sshd')
  assert.equal(telemetry.processId,144)
  assert.equal(telemetry.binaryHash,'abc')
})

test('linux telemetry drops typed secrets and message content',()=>{
  const telemetry=sanitizeLinuxTelemetry({processName:'browser',keystrokes:'secret',typedText:'hello',password:'pw',clipboardContents:'private',messageBody:'private message',apiKey:'key'})
  assert.equal(telemetry.processName,'browser')
  for(const forbidden of ['keystrokes','typedText','password','clipboardContents','messageBody','apiKey'])assert.equal(Object.hasOwn(telemetry,forbidden),false)
})

test('sensitive capture attempts are dropped and alerted',()=>{
  const result=detectSensitiveCapture({processName:'browser',keystrokes:'x',token:'y'})
  assert.equal(result.detected,true)
  assert.equal(result.action,'drop-and-alert')
  assert.deepEqual(result.forbiddenFields.sort(),['keystrokes','token'])
})

test('adapter is observe-only by default',()=>{
  const observation=buildLinuxObservation({eventType:'process',processName:'bash',processId:42})
  assert.equal(observation.mode,'observe-only')
  assert.equal(observation.platform,'linux')
  assert.equal(observation.telemetry.processName,'bash')
})
