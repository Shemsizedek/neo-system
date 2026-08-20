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
  }
]

export function findNeoLingoTerm(input: string): NeoLingoTerm | undefined {
  const normalized = input.trim().toLocaleLowerCase()
  return neoLingoCodex.find(entry =>
    entry.term.toLocaleLowerCase() === normalized ||
    entry.aliases?.some(alias => alias.toLocaleLowerCase() === normalized)
  )
}
