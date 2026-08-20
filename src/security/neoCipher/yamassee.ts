import type { NeoCipherEnvelope, YamasseeCarrier } from './types'
import { base64UrlToBytes, bytesToBase64Url, fromUtf8, utf8 } from './encoding'

const CARRIER_PREFIX = 'YD1.'

export function toYamasseeCarrier(envelope: NeoCipherEnvelope): YamasseeCarrier {
  const payload = CARRIER_PREFIX + bytesToBase64Url(utf8(JSON.stringify(envelope)))
  return {
    format: 'YAMASSEE-CARRIER-1',
    payload,
    fontFamily: 'YAMASSEEGLYPH',
    note: 'Render the carrier payload with the licensed Yamassee/Nuwaubian font. The glyph layer is presentation/transport, not the cryptographic primitive.'
  }
}

export function fromYamasseeCarrier(carrier: YamasseeCarrier | string): NeoCipherEnvelope {
  const payload = typeof carrier === 'string' ? carrier : carrier.payload
  if (!payload.startsWith(CARRIER_PREFIX)) {
    throw new Error('Invalid Yamassee carrier prefix.')
  }

  const decoded = fromUtf8(base64UrlToBytes(payload.slice(CARRIER_PREFIX.length)))
  const envelope = JSON.parse(decoded) as NeoCipherEnvelope

  if (
    envelope.version !== 'NEO-CIPHER-1' ||
    envelope.protocol !== '#D' ||
    envelope.symbolicConstants?.cycle !== 999 ||
    envelope.symbolicConstants?.resonance !== 144
  ) {
    throw new Error('Invalid or unsupported NEO Cipher envelope.')
  }

  return envelope
}
