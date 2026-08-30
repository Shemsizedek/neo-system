import test from 'node:test'
import assert from 'node:assert/strict'
import {createOperatorAuditReceipt,emitOperatorAuditReceipt} from '../core/operator-audit.js'

const entry={
  actorId:'123456789012345678',
  guildId:'234567890123456789',
  service:'neo-miner',
  outcome:'success',
  correlationId:'345678901234567890',
  at:'2026-08-30T01:00:00.000Z'
}

test('operator audit receipt is deterministic and SHA-256 addressed',async()=>{
  const a=await createOperatorAuditReceipt(entry)
  const b=await createOperatorAuditReceipt(entry)
  assert.equal(a.digest,b.digest)
  assert.match(a.digest,/^sha256:[0-9a-f]{64}$/)
  assert.match(a.receiptId,/^neo-audit-[0-9a-f]{24}$/)
  assert.equal(a.sensitiveDataIncluded,false)
  assert.equal(a.protectedPayloadIncluded,false)
})

test('receipt contains only approved audit metadata',async()=>{
  const receipt=await createOperatorAuditReceipt({...entry,token:'secret-token',payload:{contact:'private'}})
  const text=JSON.stringify(receipt)
  assert.equal(text.includes('secret-token'),false)
  assert.equal(text.includes('private'),false)
  assert.deepEqual(Object.keys(receipt).sort(),[
    'action','actorId','at','correlationId','digest','event','guildId','outcome','protectedPayloadIncluded','receiptId','sensitiveDataIncluded','service','version'
  ].sort())
})

test('emitted audit receipt remains structured and secret-free',async()=>{
  const receipt=await createOperatorAuditReceipt(entry)
  const writes=[]
  emitOperatorAuditReceipt(receipt,{logger:{info:value=>writes.push(value)}})
  assert.equal(writes.length,1)
  const parsed=JSON.parse(writes[0])
  assert.equal(parsed.receipt,true)
  assert.equal(parsed.receiptId,receipt.receiptId)
  assert.equal(parsed.protectedPayloadIncluded,false)
})
