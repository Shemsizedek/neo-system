import type { NeoLingoTerm } from './types'

export const neoLingoCodex: NeoLingoTerm[] = [
  {
    term: 'Noology',
    aliases: ['Noological State'],
    laymanTranslation: 'Mindset / Consciousness state',
    definition: 'The study or operation of mind, intentionality, and thought dynamics as actual forces.',
    preserveSourceTerm: true
  },
  {
    term: 'Natural Philosophy',
    laymanTranslation: 'How the natural world actually works',
    definition: 'Observing physical and universal laws before modern institutional science compartmentalized them.',
    preserveSourceTerm: true
  },
  {
    term: 'Triadic Initiation',
    aliases: ['3-6-9 Framework'],
    laymanTranslation: 'Three-step structural progression — Input, Process, Output / Seed, Growth, Fruit',
    definition: 'A foundational pattern for structuring systems, growth stages, and code logic.',
    preserveSourceTerm: true
  },
  {
    term: 'Vortex Dynamics',
    aliases: ['Vector Flow'],
    laymanTranslation: 'Energy or information flow efficiency',
    definition: 'How momentum builds and moves through a closed or open feedback loop.',
    preserveSourceTerm: true
  },
  {
    term: 'Street-Smart Nuance',
    aliases: ['Emotional Intelligence'],
    laymanTranslation: 'Real-world awareness / Knowing the room',
    definition: 'Combining book knowledge with practical intuition, leverage, and social discernment.',
    preserveSourceTerm: true
  },
  {
    term: 'NEO Protocol',
    aliases: ['System Charter'],
    laymanTranslation: 'Operating rules / Standard operating procedure',
    definition: 'The core rules governing agent behavior, output formatting, and response logic.',
    preserveSourceTerm: true
  },
  {
    term: 'Neogram',
    aliases: ['NEO Telegram'],
    laymanTranslation: 'NEO secure messaging product',
    definition: 'The official public product name for the NEO messaging application. NEO Telegram remains a legacy compatibility name while NTP remains the underlying protocol.',
    preserveSourceTerm: true
  },
  {
    term: 'NTP',
    aliases: ['NEO Telegram Protocol'],
    laymanTranslation: 'NEO message format and rules',
    definition: 'The protocol that defines Neogram message envelopes, signing, encryption metadata, routing fields, and message-state semantics.',
    preserveSourceTerm: true
  },
  {
    term: 'NVSN',
    aliases: ['NEO Virtual Satellite Network'],
    laymanTranslation: 'NEO transport and relay network layer',
    definition: 'The network and transport layer used to route or relay NTP messages between authenticated identities and compatible NEO communication endpoints.',
    preserveSourceTerm: true
  },
  {
    term: 'Identity Binding',
    laymanTranslation: 'Cryptographically tying an identity to its public keys',
    definition: 'A security control that associates a NEO identity with signing and encryption public-key material so messages and relay requests can be verified.',
    preserveSourceTerm: true
  },
  {
    term: 'Authenticated Relay',
    aliases: ['NVSN Relay'],
    laymanTranslation: 'A secure store-and-forward message relay',
    definition: 'A relay service that authenticates requests, rejects replay attempts, stores encrypted envelopes rather than plaintext, applies rate and TTL limits, and delivers messages to the intended authenticated identity.',
    preserveSourceTerm: true
  },
  {
    term: 'Secure Envelope',
    aliases: ['Encrypted NTP Envelope'],
    laymanTranslation: 'An encrypted and signed message package',
    definition: 'A structured NTP message object containing ciphertext, integrity/signature metadata, routing information, nonce and expiration controls without exposing the plaintext payload to the relay.',
    preserveSourceTerm: true
  }
]

export function findNeoLingoTerm(input: string): NeoLingoTerm | undefined {
  const normalized = input.trim().toLocaleLowerCase()
  return neoLingoCodex.find(entry =>
    entry.term.toLocaleLowerCase() === normalized ||
    entry.aliases?.some(alias => alias.toLocaleLowerCase() === normalized)
  )
}
