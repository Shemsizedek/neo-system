export type NeoCipherVersion = 'NEO-CIPHER-1'

export type NeoCipherEnvelope = {
  version: NeoCipherVersion
  protocol: '#D'
  symbolicConstants: {
    cycle: 999
    resonance: 144
  }
  algorithm: 'AES-GCM-256'
  kdf: 'PBKDF2-SHA-256'
  iterations: number
  salt: string
  iv: string
  ciphertext: string
  createdAt: string
}

export type NeoCipherEncryptOptions = {
  passphrase: string
  iterations?: number
}

export type NeoCipherDecryptOptions = {
  passphrase: string
}

export type YamasseeCarrier = {
  format: 'YAMASSEE-CARRIER-1'
  payload: string
  fontFamily: 'YAMASSEEGLYPH'
  note: string
}
