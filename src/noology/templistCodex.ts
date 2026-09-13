export type TemplistCodexBook = {
  number: number
  title: string
  canonRange: string
  focus: string
}

export const templistCodex = Object.freeze({
  id: 'templist-codex-of-canons',
  status: 'CANONICAL_COMPLETE',
  authorityContext: 'Holy Temples of Moorish Science, Branch Temple No. 24 — World Temple',
  books: [
    {
      number: 8,
      title: 'The Holy Instructions of the Circle Seven',
      canonRange: '1671-1710',
      focus: 'Holy Koran Circle Seven Holy Instructions of Prophet Noble Drew Ali; Neoteric Method obligation for Noologic thinking.'
    },
    {
      number: 9,
      title: 'The Holy Tablets and the Ecclesiastical Deed Poll',
      canonRange: '1711-1730',
      focus: 'Holy Tablets, Ecclesiastical Deed Poll, Seven Seals, Book of Wisdom, Book of Destiny / Mother Tablet, and related Temple-supplied sacred-text framework.'
    }
  ] satisfies TemplistCodexBook[],
  draftingProtocol: Object.freeze({
    oneCanonPerEntry: true,
    combineCanonNumbers: false,
    preserveNumbering: true,
    preserveStructure: true,
    innovateOnlyWhenExplicitlyRequested: true,
    template: 'Can. <number> Text for Canon goes next.'
  }),
  reasoningProtocol: Object.freeze({
    method: 'Neoteric Method',
    requiredForNoologicThinking: true,
    preserveSourceTerminology: true,
    preserveProvenance: true,
    distinguishDoctrineFromExternalFact: true,
    doNotFabricateMissingSourceMaterial: true
  }),
  routedSystems: Object.freeze([
    'NEO Algo',
    'NEO Oracle',
    'GISD NEO LMS',
    'GISS NEO LMS',
    'NEOsync',
    'NEO Law',
    'Internal NEO Society Social Norms',
    'Temple Tribunal',
    'NEO Prime',
    'NEO Knowledge Graph'
  ])
})

export function templistCanonDraftingDirectives() {
  return [
    'Preserve the supplied canon number and sequence.',
    'Keep each canon separate; never combine canon numbers.',
    'Preserve TITLE, CHAPTER, Article, section, and numbered-list structure.',
    'Adapt only what is necessary for the Branch Temple No. 24 perspective.',
    'Do not add innovations unless explicitly requested.',
    'Apply the Neoteric Method as the required Noologic reasoning discipline.',
    'Preserve source provenance and distinguish internal doctrine from external factual claims.'
  ] as const
}
