import { createDecipheriv, createHash, timingSafeEqual } from 'node:crypto'
import { constants, openSync, closeSync, readFileSync, writeFileSync, fsyncSync, fstatSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { createSealedPressMedia } from './sealed-media.mjs'

const MAGIC = Buffer.from('NPRESS3')
const hash = b => createHash('sha256').update(b).digest('hex')
function readSealed(path, maxBytes) {
  const fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW || 0))
  try {
    const stat = fstatSync(fd)
    if (!stat.isFile() || (stat.mode & 0o077) || stat.size > maxBytes + 64 || stat.size < 36) {
      throw new Error('unsafe_encrypted_source')
    }
    const contents = readFileSync(fd)
    if (!contents.subarray(0,7).equals(MAGIC)) throw new Error('unknown_media_envelope')
    return contents
  } finally { closeSync(fd) }
}
function writeExclusive(path, bytes) {
  const fd = openSync(path, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | (constants.O_NOFOLLOW || 0), 0o600)
  try { writeFileSync(fd,bytes); fsyncSync(fd) }
  finally {closeSync(fd)}
}
function metadata({caseId,evidenceId,originalSha256}) {
  if (!/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(caseId) ||
    !/^[0-9a-f-]{36}$/.test(evidenceId) ||
    !/^[a-f0-9]{64}$/.test(originalSha256)) throw new Error('invalid_media_recovery_binding')
  return Buffer.from(JSON.stringify(['NEO-PRESS-MEDIA',1,caseId,evidenceId.toLowerCase(),originalSha256]))
}

// Read only encrypted source bytes; restore to a separate empty protected
// directory and revalidate against original. This is a local restore drill;
// external backup/PITR/retention are not certified by a successful result.
export function rehearseEncryptedRestore({
  sourceRoot, restoreRoot, encryptionKey, keyId, caseId, evidenceId,
  originalSha256, maxBytes = 8 * 1024 * 1024
}) {
  if (resolve(sourceRoot) === resolve(restoreRoot)) throw new Error('separate_restore_directory_required')
  const source=createSealedPressMedia({rootDir:sourceRoot,encryptionKey,keyId,maxBytes})
  source.verify({caseId,evidenceId,originalSha256})
  const output=createSealedPressMedia({rootDir:restoreRoot,encryptionKey,keyId,maxBytes})
  const sourceBytes=readSealed(join(resolve(sourceRoot),evidenceId.toLowerCase()+'.npress'),maxBytes)
  writeExclusive(join(resolve(restoreRoot),evidenceId.toLowerCase()+'.npress'),sourceBytes)
  const verified=output.verify({caseId,evidenceId,originalSha256})
  return { localRecoveryTestPassed:verified.integrityVerified, productionBackupVerified:false,
    evidenceId, originalSha256, encryptedBytes:sourceBytes.length,
    independentRestoreVerified:false }
}

// Stage a re-encrypted copy in a DIFFERENT protected directory, leaving
// the old original untouched. Cutover, key revocation and shredding are
// intentionally excluded until externally approved/recorded.
export function stageMediaKeyRotation({
  sourceRoot, stagingRoot, oldEncryptionKey, oldKeyId, newEncryptionKey, newKeyId,
  caseId, evidenceId, originalSha256, maxBytes = 8 * 1024 * 1024
}) {
  if (resolve(sourceRoot) === resolve(stagingRoot)) throw new Error('separate_rotation_staging_required')
  if (oldKeyId === newKeyId ||
    !Buffer.isBuffer(oldEncryptionKey) || !Buffer.isBuffer(newEncryptionKey) ||
    oldEncryptionKey.length !== 32 || newEncryptionKey.length !== 32 ||
    timingSafeEqual(oldEncryptionKey,newEncryptionKey)) throw new Error('distinct_rotation_key_required')
  const oldVault=createSealedPressMedia({rootDir:sourceRoot,encryptionKey:oldEncryptionKey,keyId:oldKeyId,maxBytes})
  oldVault.verify({caseId,evidenceId,originalSha256})
  const packet=readSealed(join(resolve(sourceRoot),evidenceId.toLowerCase()+'.npress'),maxBytes)
  const nonce=packet.subarray(7,19), tag=packet.subarray(19,35)
  const decipher=createDecipheriv('aes-256-gcm',oldEncryptionKey,nonce)
  decipher.setAAD(metadata({caseId,evidenceId,originalSha256}))
  decipher.setAuthTag(tag)
  let plaintext
  try {
    plaintext=Buffer.concat([decipher.update(packet.subarray(35)),decipher.final()])
    if (hash(plaintext)!==originalSha256) throw new Error('original_digest_mismatch')
    const staged=createSealedPressMedia({rootDir:stagingRoot,encryptionKey:newEncryptionKey,keyId:newKeyId,maxBytes})
    const receipt=staged.seal({caseId,evidenceId,originalBytes:plaintext,expectedSha256:originalSha256})
    const verified=staged.verify({caseId,evidenceId,originalSha256})
    if (!verified.integrityVerified) throw new Error('rotation_staged_integrity_failed')
    return { staged:true, cutoverPerformed:false, originalRetained:true,
      originalSha256, evidenceId, fromKeyId:oldKeyId,toKeyId:newKeyId,
      stagedCiphertextBytes:receipt.encryptedBytes,
      productionKeyRotationVerified:false }
  } finally { if (plaintext) plaintext.fill(0) }
}
