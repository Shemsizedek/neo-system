import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import policy from '../../architecture/neo-storage-fabric-policy.json' with {type:'json'}
import {createStorageObject,verifyStoredObject,addReplica,replicationState,retentionAllowsDelete,createFilesystemStorage,verifyExportBundle,restoreObjectFromExport} from './fabric.mjs'

test('objects are encrypted and content-addressed',()=>{
 const key=crypto.randomBytes(32),obj=createStorageObject({bytes:'estate record',storageClass:'EVIDENCE',key,policy})
 assert.match(obj.object_id,/^sha256:/)
 assert.notEqual(obj.ciphertext.toString(),'estate record')
 assert.equal(verifyStoredObject(obj,{key}).valid,true)
})
test('replication policy distinguishes requirement from confirmed evidence',()=>{
 const key=crypto.randomBytes(32),obj=createStorageObject({bytes:'x',storageClass:'BACKUP',key,policy})
 const one=addReplica(obj,{nodeId:'storage-1',verified:true})
 assert.equal(replicationState(one).satisfied,false)
 assert.equal(replicationState(one).confirmed,1)
})
test('indefinite retention cannot be deleted even with approval',()=>{
 const key=crypto.randomBytes(32),obj=createStorageObject({bytes:'x',storageClass:'CROWN_RECORD',key,policy})
 assert.equal(retentionAllowsDelete(obj,{approved:true}).allowed,false)
})
test('provider-independent export verifies encrypted blob integrity and restores plaintext',()=>{
 const key=crypto.randomBytes(32),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'neo-storage-')),store=createFilesystemStorage(path.join(tmp,'store'))
 const obj=createStorageObject({bytes:'portable estate data',storageClass:'ARCHIVE',key,policy});store.put(obj)
 const exportDir=path.join(tmp,'export');store.exportBundle(exportDir)
 assert.equal(verifyExportBundle(exportDir).valid,true)
 assert.equal(restoreObjectFromExport(exportDir,obj.content_digest,{key}).toString(),'portable estate data')
})
