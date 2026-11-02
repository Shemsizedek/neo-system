import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createSealedPressMedia } from './sealed-media.mjs'
import { rehearseEncryptedRestore, stageMediaKeyRotation } from './recovery.mjs'
import { sha256 } from './evidence.mjs'

test('isolated encrypted restore drill preserves ciphertext without modifying original',()=>{
  const root=mkdtempSync(join(tmpdir(),'press-004-'))
  const caseId='CASE-001', evidenceId='9c7c0b49-78d9-4fce-91a9-24ec6e4ae734'
  const original=Buffer.from('simulated private sample; not a real user credential')
  const originalSha256=sha256(original), key=randomBytes(32), keyId='media-key-0001'
  const sourceRoot=join(root,'source'), restoreRoot=join(root,'restored')
  try {
    const source=createSealedPressMedia({rootDir:sourceRoot,encryptionKey:key,keyId})
    source.seal({caseId,evidenceId,originalBytes:original,expectedSha256:originalSha256})
    const before=readFileSync(join(sourceRoot,evidenceId+'.npress'))
    const result=rehearseEncryptedRestore({sourceRoot,restoreRoot,encryptionKey:key,keyId,caseId,evidenceId,originalSha256})
    assert.equal(result.localRecoveryTestPassed,true)
    assert.equal(result.productionBackupVerified,false)
    assert.deepEqual(readFileSync(join(restoreRoot,evidenceId+'.npress')),before)
    assert.deepEqual(readFileSync(join(sourceRoot,evidenceId+'.npress')),before)
    assert.throws(()=>rehearseEncryptedRestore({sourceRoot,restoreRoot:sourceRoot,encryptionKey:key,keyId,caseId,evidenceId,originalSha256}),/separate_restore/)
  }finally{rmSync(root,{recursive:true,force:true})}
})
test('rotation stages distinct independently encrypted original, cannot overwrite or rotate to same key',()=>{
  const root=mkdtempSync(join(tmpdir(),'press-004-'))
  const caseId='CASE-002', evidenceId='dc8fcf69-b540-4cbd-a20c-30dc0ac0b4a1'
  const bytes=Buffer.from('mock sealed press source')
  const originalSha256=sha256(bytes),oldEncryptionKey=randomBytes(32),newEncryptionKey=randomBytes(32)
  const sourceRoot=join(root,'current'), stagingRoot=join(root,'staged')
  try{
    const source=createSealedPressMedia({rootDir:sourceRoot,encryptionKey:oldEncryptionKey,keyId:'old-key-0001'})
    source.seal({caseId,evidenceId,originalBytes:bytes,expectedSha256:originalSha256})
    const before=readFileSync(join(sourceRoot,evidenceId+'.npress'))
    const args={sourceRoot,stagingRoot,oldEncryptionKey,oldKeyId:'old-key-0001',
      newEncryptionKey,newKeyId:'new-key-0002',caseId,evidenceId,originalSha256}
    const result=stageMediaKeyRotation(args)
    assert.equal(result.staged,true)
    assert.equal(result.cutoverPerformed,false)
    assert.equal(result.productionKeyRotationVerified,false)
    assert.deepEqual(readFileSync(join(sourceRoot,evidenceId+'.npress')),before)
    assert.notDeepEqual(readFileSync(join(stagingRoot,evidenceId+'.npress')),before)
    const newVault=createSealedPressMedia({rootDir:stagingRoot,encryptionKey:newEncryptionKey,keyId:'new-key-0002'})
    assert.equal(newVault.verify({caseId,evidenceId,originalSha256}).integrityVerified,true)
    assert.throws(()=>newVault.verify({caseId:'CASE-OTHER',evidenceId,originalSha256}),/authentication_failed/)
    assert.throws(()=>stageMediaKeyRotation(args),/EEXIST/)
    assert.throws(()=>stageMediaKeyRotation({...args,stagingRoot:join(root,'same-key'),newEncryptionKey:oldEncryptionKey}),/distinct_rotation_key/)
    assert.throws(()=>stageMediaKeyRotation({...args,stagingRoot:sourceRoot}),/separate_rotation_staging/)
  }finally{rmSync(root,{recursive:true,force:true})}
})
test('missing or incorrect source encryption keys never create usable restored evidence',()=>{
  const root=mkdtempSync(join(tmpdir(),'press-004-'))
  const caseId='CASE-003',evidenceId='c7d8f315-b646-4433-bb70-4b8549f5f0ca'
  const bytes=Buffer.from('mock evidence'),originalSha256=sha256(bytes),key=randomBytes(32)
  const sourceRoot=join(root,'source')
  try{
    createSealedPressMedia({rootDir:sourceRoot,encryptionKey:key,keyId:'key-one-0001'})
      .seal({caseId,evidenceId,originalBytes:bytes,expectedSha256:originalSha256})
    assert.throws(()=>rehearseEncryptedRestore({
      sourceRoot,restoreRoot:join(root,'wrong'),encryptionKey:randomBytes(32),
      keyId:'key-one-0001',caseId,evidenceId,originalSha256
    }),/authentication_failed/)
    assert.throws(()=>stageMediaKeyRotation({
      sourceRoot,stagingRoot:join(root,'stage'),oldEncryptionKey:randomBytes(32),
      oldKeyId:'key-one-0001',newEncryptionKey:randomBytes(32),
      newKeyId:'key-two-0002',caseId,evidenceId,originalSha256
    }),/authentication_failed/)
  }finally{rmSync(root,{recursive:true,force:true})}
})
