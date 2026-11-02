import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'
import { constants, existsSync, lstatSync, mkdirSync, openSync, closeSync, writeFileSync, readFileSync, fsyncSync, unlinkSync } from 'node:fs'
import { isAbsolute, resolve, join, dirname } from 'node:path'

const MAGIC = Buffer.from('NPRESS3') // 7-byte envelope version, nonce, tag, ciphertext
const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CASE = /^[A-Z0-9][A-Z0-9_-]{2,63}$/
const SHA = /^[a-f0-9]{64}$/
const digest = b => createHash('sha256').update(b).digest('hex')

function safeDirectory(root) {
  if (!isAbsolute(root) || resolve(root) === resolve(process.cwd()) ||
    resolve(root).startsWith(resolve(process.cwd()) + '/')) {
    throw new Error('private_absolute_storage_outside_checkout_required')
  }
  const path = resolve(root)
  // Existing path components must not be symbolic links. Fail closed.
  const ancestors = []
  let current = path
  while (true) {
    ancestors.unshift(current)
    const parent = dirname(current)
    if (parent === current) break
    current = parent
  }
  for (const part of ancestors) {
    if (existsSync(part) && lstatSync(part).isSymbolicLink()) throw new Error('symlink_storage_forbidden')
  }
  mkdirSync(path, { recursive: true, mode: 0o700 })
  const stat = lstatSync(path)
  if (!stat.isDirectory() || (stat.mode & 0o077) !== 0) throw new Error('private_directory_permissions_required')
  return path
}

export function createSealedPressMedia({ rootDir, encryptionKey, keyId, maxBytes = 8 * 1024 * 1024 } = {}) {
  if (!Buffer.isBuffer(encryptionKey) || encryptionKey.length !== 32 ||
    typeof keyId !== 'string' || !/^[A-Za-z0-9_-]{4,64}$/.test(keyId)) {
    throw new Error('external_256_bit_media_key_required')
  }
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 64 * 1024 * 1024) {
    throw new Error('invalid_media_size_limit')
  }
  if (typeof rootDir !== 'string' || !rootDir.trim()) throw new Error('private_media_root_required')
  const root = safeDirectory(rootDir)
  function target(id) {
    if (!ID.test(String(id))) throw new Error('invalid_evidence_id')
    return join(root, id.toLowerCase() + '.npress')
  }
  function aad({caseId, evidenceId, sha256}) {
    if (!CASE.test(String(caseId)) || !ID.test(String(evidenceId)) || !SHA.test(String(sha256))) {
      throw new Error('invalid_media_binding')
    }
    return Buffer.from(JSON.stringify(['NEO-PRESS-MEDIA', 1, caseId, evidenceId.toLowerCase(), sha256]))
  }
  function seal({caseId, evidenceId, originalBytes, expectedSha256}) {
    if (!Buffer.isBuffer(originalBytes) || originalBytes.length < 1 || originalBytes.length > maxBytes) {
      throw new Error('media_size_or_type_not_allowed')
    }
    const sha256 = digest(originalBytes)
    if (expectedSha256 && expectedSha256 !== sha256) throw new Error('original_media_sha256_mismatch')
    const associated = aad({ caseId, evidenceId, sha256 })
    const nonce = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', encryptionKey, nonce)
    cipher.setAAD(associated)
    const ciphertext = Buffer.concat([cipher.update(originalBytes), cipher.final()])
    const envelope = Buffer.concat([MAGIC, nonce, cipher.getAuthTag(), ciphertext])
    const path = target(evidenceId)
    const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW || 0)
    const fd = openSync(path, flags, 0o600)
    try { writeFileSync(fd, envelope); fsyncSync(fd) }
    catch (error) { closeSync(fd); unlinkSync(path); throw error }
    closeSync(fd)
    return Object.freeze({ evidenceId: evidenceId.toLowerCase(), caseId, originalSha256: sha256,
      encryptedBytes: envelope.length, plaintextBytes: originalBytes.length,
      algorithm: 'AES-256-GCM', keyId, mediaStored: true })
  }
  function verify({caseId, evidenceId, originalSha256}) {
    const associated = aad({caseId, evidenceId, sha256: originalSha256})
    const file = target(evidenceId)
    const stat = lstatSync(file)
    if (!stat.isFile() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0 ||
      stat.size < MAGIC.length + 12 + 16 + 1 || stat.size > maxBytes + 64) {
      throw new Error('encrypted_media_file_invalid')
    }
    const packet = readFileSync(file)
    if (!packet.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('unsupported_encrypted_media')
    const nonce = packet.subarray(MAGIC.length, MAGIC.length + 12)
    const tag = packet.subarray(MAGIC.length + 12, MAGIC.length + 28)
    const decipher = createDecipheriv('aes-256-gcm', encryptionKey, nonce)
    decipher.setAAD(associated)
    decipher.setAuthTag(tag)
    let original
    try { original = Buffer.concat([decipher.update(packet.subarray(MAGIC.length + 28)), decipher.final()]) }
    catch { throw new Error('encrypted_media_authentication_failed') }
    if (digest(original) !== originalSha256) throw new Error('original_media_digest_failed')
    // No plaintext returned: this is a check operation, not an export.
    return Object.freeze({ evidenceId: evidenceId.toLowerCase(), caseId,
      originalSha256, plaintextBytes: original.length, integrityVerified: true,
      externallyAttested: false, keyId })
  }
  function discardUnlinked(evidenceId) {
    const file = target(evidenceId)
    if (existsSync(file)) unlinkSync(file)
  }
  return Object.freeze({ seal, verify, discardUnlinked })
}
