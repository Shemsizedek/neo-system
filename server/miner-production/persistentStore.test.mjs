import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {PersistentStateStore,hydrateMap} from './persistentStore.mjs'

test('financial state survives close and reopen',()=>{
  const dir=mkdtempSync(join(tmpdir(),'neo-miner-store-')),db=join(dir,'state.sqlite')
  try{
    const first=new PersistentStateStore(db)
    first.put('payout','PAY-1',{id:'PAY-1',customerId:'C1',amountBtc:0.01,state:'APPROVED'},{action:'PAYOUT_APPROVED'})
    first.put('hashvault_entry','HV-1',{id:'HV-1',customerId:'C1',netBtc:0.02,verified:true},{action:'HASHVAULT_CREDIT'})
    first.close()
    const second=new PersistentStateStore(db)
    assert.equal(second.get('payout','PAY-1').state,'APPROVED')
    assert.equal(hydrateMap(second,'payout').get('PAY-1').amountBtc,0.01)
    assert.equal(second.list('hashvault_entry').length,1)
    assert.ok(second.audit().some(e=>e.action==='HASHVAULT_CREDIT'))
    second.close()
  }finally{rmSync(dir,{recursive:true,force:true})}
})

test('idempotent financial write returns original result and does not duplicate audit',()=>{
  const dir=mkdtempSync(join(tmpdir(),'neo-miner-idem-')),db=join(dir,'state.sqlite')
  try{
    const store=new PersistentStateStore(db)
    const original={id:'HV-2',customerId:'C2',netBtc:0.005,verified:true}
    const a=store.idempotentPut({scope:'hashvault-credit',key:'req-123',kind:'hashvault_entry',id:original.id,value:original,action:'HASHVAULT_CREDIT'})
    const b=store.idempotentPut({scope:'hashvault-credit',key:'req-123',kind:'hashvault_entry',id:'HV-DIFFERENT',value:{id:'HV-DIFFERENT',netBtc:99},action:'HASHVAULT_CREDIT'})
    assert.equal(a.replayed,false)
    assert.equal(b.replayed,true)
    assert.deepEqual(b.value,original)
    assert.equal(store.list('hashvault_entry').length,1)
    assert.equal(store.audit().filter(e=>e.action==='HASHVAULT_CREDIT').length,1)
    store.close()
  }finally{rmSync(dir,{recursive:true,force:true})}
})
