export class VmInputError extends Error {
  constructor(code) {
    super(code)
    this.name = 'VmInputError'
    this.code = code
  }
}

export function requireFields(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new VmInputError('INVALID_RECORD')
  }
  const keys = Reflect.ownKeys(value)
  if (keys.length !== fields.length || keys.some(key => !fields.includes(key)) ||
      fields.some(key => !Object.hasOwn(value, key))) throw new VmInputError('INVALID_FIELDS')
}

export function decodeHex(value, maxBytes, code = 'INVALID_HEX') {
  // Check the bound before decoding or scanning an arbitrarily large string.
  if (typeof value !== 'string' || value.length > maxBytes * 2 ||
      value.length % 2 || !/^[0-9a-fA-F]*$/.test(value)) throw new VmInputError(code)
  return Buffer.from(value, 'hex')
}

export function requireRegtest(network) {
  if (network !== 'regtest') throw new VmInputError('REGTEST_ONLY')
}
