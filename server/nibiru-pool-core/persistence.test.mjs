import test from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {NibiruPoolStore,shareFingerprint} from './persistence.mjs'

const share={
  poolId:'world-mint-genesis',
  jobId:'job-1',
  workerId:'worker-1',
  extranonce2:'00000001',
  ntime:'68b47c00',
  nonce:'00000002',
  submissionId:'random-a',
  accepted:true
}

test('share fingerprint ignores random submission ids',()=>{
  assert.equal(shareFingerprint(share),shareFingerprint({...share,submissionId:'random-b'}))
})

test('share fingerprint changes when proof tuple changes',()=>{
  assert.notEqual(shareFingerprint(share),shareFingerprint({...share,nonce:'00000003'}))
})

test('share fingerprint requires the complete proof tuple',()=>{
  assert.throws(()=>shareFingerprint({...share,extranonce2:''}),/SHARE_EXTRANONCE2_REQUIRED/)
})

test('replayed share persists idempotently under one deterministic identity',()=>{
  const dir=mkdtempSync(join(tmpdir(),'nibiru-share-'))
  const store=new NibiruPoolStore(join(dir,'pool.sqlite'))
  try{
    const first=store.saveShare(share)
    const replay=store.saveShare({...share,submissionId:'random-b'})
    assert.deepEqual(replay,first)
    const fingerprint=shareFingerprint(share)
    const rows=store.store.list('nibiru_share')
    assert.equal(rows.length,1)
    assert.equal(rows[0].shareFingerprint,fingerprint)
  }finally{
    store.close()
    rmSync(dir,{recursive:true,force:true})
  }
})
