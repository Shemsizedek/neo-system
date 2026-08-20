export type NoologicalProvenanceClass =
  | 'NEO_DEFINED'
  | 'SOURCE_DERIVED'
  | 'NEO_SYNTHESIS'
  | 'EXTERNAL_DISCIPLINE'
  | 'ALIAS_PENDING_DISTINCTION'

export type NoologicalDoctrineDomain =
  | 'knowledge'
  | 'method'
  | 'nature'
  | 'mind'
  | 'language'
  | 'history'
  | 'future'
  | 'genesis'
  | 'ethics'
  | 'community'

export type NoologicalDiscipline = {
  id: string
  name: string
  aliases?: string[]
  provenanceClass: NoologicalProvenanceClass
  domains: NoologicalDoctrineDomain[]
  definition: string
  functionInNeoSystem: string
  questions: string[]
  related: string[]
  sourceRefs?: string[]
  cautions?: string[]
}

/**
 * NEO Noological Doctrine Stack
 *
 * The registry intentionally separates source-derived teachings, NEO-defined
 * disciplines, NEO synthesis and external disciplines. Similar words are not
 * silently treated as identical. A term can be promoted or refined when a
 * primary source supplies a more precise definition.
 */
export const noologicalDisciplines: NoologicalDiscipline[] = [
  {
    id: 'NOOLOGY',
    name: 'Noology',
    provenanceClass: 'NEO_DEFINED',
    domains: ['knowledge', 'mind', 'nature', 'ethics'],
    definition:
      'The science and study of knowledge, intelligence, consciousness, wisdom, sound reasoning, and the nature of knowing within living reality.',
    functionInNeoSystem:
      'Acts as the umbrella reasoning science. It integrates evidence, consciousness, nature, provenance, ethics and practical consequences rather than reducing inquiry to formal logic alone.',
    questions: [
      'What is known?',
      'How is it known?',
      'What kind of mind or consciousness is producing the interpretation?',
      'What does nature reveal about the relationship?',
      'What consequences follow from the reasoning?'
    ],
    related: ['FACTOLOGY', 'NOETICS', 'NOOGONY', 'NOOGENESIS', 'NEOTERIC_METHOD', 'NOONE_SCIENCE']
  },
  {
    id: 'NUWAUBU',
    name: 'Nuwau-Bu',
    aliases: ['Nuwaubu', 'NUWAU-BU'],
    provenanceClass: 'SOURCE_DERIVED',
    domains: ['knowledge', 'mind', 'ethics', 'community'],
    definition:
      'A source-described spiritual science centered on Right Knowledge, organized understanding, liberty, equality, justice, rightness and proper survival.',
    functionInNeoSystem:
      'Provides a source-grounded liberation-and-order pattern: knowledge must be studied, organized, practiced and converted into right thinking and right action.',
    questions: [
      'Is the knowledge organized in sequence?',
      'Does it increase liberty, equality, justice, rightness and responsible survival?',
      'Is it being practiced rather than merely repeated?'
    ],
    related: ['NUWAUPU', 'NOOLOGY', 'NEOTERIC_METHOD', 'NOONE_PHILOSOPHY'],
    sourceRefs: [
      'Breaking The Spell: Right Knowledge → Right Wisdom → Right Overstanding → Right Thinking → Right Words/Works.',
      'Breaking The Spell: knowledge must be organized in sequence; NUWAU-BU is described as a spiritual science.'
    ]
  },
  {
    id: 'NUWAUPU',
    name: 'Nuwaupu',
    aliases: ['Noo-Wau-Poo'],
    provenanceClass: 'ALIAS_PENDING_DISTINCTION',
    domains: ['knowledge', 'method', 'community'],
    definition:
      'A preserved phonetic/orthographic form associated in the supplied source with NUWAU-BU. The system does not yet assume that every use of Nuwaupu and Nuwau-Bu is doctrinally identical.',
    functionInNeoSystem:
      'Maintains terminology without erasing possible distinctions. Queries for either form cross-link while preserving the original spelling found in each source.',
    questions: [
      'Which spelling does the source actually use?',
      'Does the speaker distinguish Nuwaupu from Nuwau-Bu?',
      'Is this a pronunciation, transliteration, discipline name or later development?'
    ],
    related: ['NUWAUBU', 'NEOLOGY'],
    cautions: ['Refine this entry when an authoritative primary source explicitly distinguishes the terms.']
  },
  {
    id: 'FACTOLOGY',
    name: 'Factology',
    provenanceClass: 'NEO_SYNTHESIS',
    domains: ['history', 'knowledge', 'method'],
    definition:
      'The disciplined establishment of facts, chronology, provenance, documentary genealogy, source relationships and evidentiary status before interpretive conclusions are imposed.',
    functionInNeoSystem:
      'Builds the factual substrate for Noology. It separates observation, source assertion, inference, interpretation, legal effect, valuation and unresolved questions.',
    questions: [
      'What is directly documented?',
      'Who authored or transmitted it?',
      'When did it occur?',
      'What changed through succession or translation?',
      'Which propositions remain open?'
    ],
    related: ['NOOLOGY', 'NEOTERIC_METHOD', 'NOOGLE', 'NOONE_SCIENCE']
  },
  {
    id: 'NOONE_SCIENCE',
    name: 'Noone Science',
    provenanceClass: 'NEO_SYNTHESIS',
    domains: ['knowledge', 'nature', 'mind', 'method'],
    definition:
      'The NEO integrative science for studying nature, mind, knowledge, relationships, cycles, causes and consequences as one connected field of inquiry.',
    functionInNeoSystem:
      'Provides the systems-science container in which Factology supplies facts, Noology supplies reasoning science, and the Neoteric Method supplies repeatable application.',
    questions: [
      'What system are we actually observing?',
      'What are its natural relationships and feedback loops?',
      'What changes across scale, time and perspective?',
      'Which variables are measurable and which are qualitative?'
    ],
    related: ['NOOLOGY', 'FACTOLOGY', 'NOONE_PHILOSOPHY', 'NEOTERIC_METHOD', 'NOOGENESIS']
  },
  {
    id: 'NOONE_PHILOSOPHY',
    name: 'Noone Philosophy',
    provenanceClass: 'NEO_SYNTHESIS',
    domains: ['nature', 'ethics', 'knowledge', 'community'],
    definition:
      'The NEO philosophical orientation that begins with nature, relational existence, stewardship, truth, reciprocity, liberty, justice and the responsibility to align human systems with living order.',
    functionInNeoSystem:
      'Supplies first principles and ethical boundaries for governance, credit, restoration, technology, education and action.',
    questions: [
      'Is the action aligned with living systems?',
      'Does it preserve truth, dignity and reciprocity?',
      'Who benefits, who bears the cost, and what happens to future generations?',
      'Does the system restore or exploit?'
    ],
    related: ['NOOLOGY', 'NOONE_SCIENCE', 'NUWAUBU', 'AFROFUTURISM']
  },
  {
    id: 'NEOTERIC_METHOD',
    name: 'Neoteric Method',
    provenanceClass: 'NEO_DEFINED',
    domains: ['method', 'knowledge', 'future'],
    definition:
      'The practical methodology for learning, inquiry, governance, analysis and personal transformation used to examine and apply Noology.',
    functionInNeoSystem:
      'Turns doctrine into procedure: observe, establish provenance, sequence facts, compare perspectives, test consequences, transform assumptions, act, review and learn.',
    questions: [
      'What is the next testable step?',
      'Which assumption should be removed or transformed?',
      'How can the finding become a repeatable practice?',
      'What new evidence would change the conclusion?'
    ],
    related: ['NOOLOGY', 'FACTOLOGY', 'NEOLOGY', 'NOOGENESIS']
  },
  {
    id: 'NEOLOGY',
    name: 'Neology',
    provenanceClass: 'NEO_SYNTHESIS',
    domains: ['language', 'knowledge', 'future'],
    definition:
      'The disciplined creation, recovery, comparison and governance of terms needed to describe new or restored concepts without losing their provenance.',
    functionInNeoSystem:
      'Powers the NEO Lexicon and NEO Lingo layers. New words remain linked to source language, aliases, dates, definitions and later revisions.',
    questions: [
      'Why is a new term needed?',
      'What older concept does it recover or distinguish?',
      'What is its source language and semantic lineage?',
      'Could the new term hide rather than clarify meaning?'
    ],
    related: ['NUWAUPU', 'NOOGLE', 'NOETICS', 'NEOTERIC_METHOD']
  },
  {
    id: 'NOETICS',
    name: 'Noetics',
    provenanceClass: 'EXTERNAL_DISCIPLINE',
    domains: ['mind', 'knowledge'],
    definition:
      'A broad philosophical term concerning intellect, mind, understanding and the activity of knowing; in NEO it is used as a comparative discipline inside the wider noological stack.',
    functionInNeoSystem:
      'Contributes tools for examining cognition, attention, insight and mental representation without being allowed to replace NEO-defined Noology.',
    questions: [
      'What cognitive operation is occurring?',
      'What is perception versus inference?',
      'How is attention shaping the result?'
    ],
    related: ['NOOLOGY', 'NOOGONY', 'NOOGENESIS']
  },
  {
    id: 'NOOGONY',
    name: 'Noogony',
    provenanceClass: 'NEO_SYNTHESIS',
    domains: ['genesis', 'mind', 'history'],
    definition:
      'The study of the origin, formation and lineage of mind, intelligence, knowledge systems and noospheric structures.',
    functionInNeoSystem:
      'Tracks where an idea, cognitive pattern, doctrine or intelligence system came from and how it developed through time.',
    questions: [
      'What generated this way of knowing?',
      'What predecessor minds, cultures or systems contributed?',
      'Where did the pattern branch, merge or become inverted?'
    ],
    related: ['NOOGENESIS', 'NOOLOGY', 'FACTOLOGY', 'AFROFUTURISM']
  },
  {
    id: 'AFROFUTURISM',
    name: 'Afrofuturism',
    provenanceClass: 'EXTERNAL_DISCIPLINE',
    domains: ['future', 'history', 'community', 'language'],
    definition:
      'A cultural and intellectual field that explores Black and African-diasporic futures through combinations of history, technology, imagination, art, identity and speculative possibility.',
    functionInNeoSystem:
      'Supplies a comparative future-imagination lens for recovering suppressed histories while designing futures in which originating communities remain agents rather than artifacts.',
    questions: [
      'Who gets to imagine the future?',
      'Which erased histories must be restored before projecting forward?',
      'Does technology deepen extraction or expand agency?',
      'What future becomes possible when the originating people author it?'
    ],
    related: ['NOOGENESIS', 'NOONE_PHILOSOPHY', 'NEOTERIC_METHOD']
  },
  {
    id: 'NOOGENESIS',
    name: 'Noogenesis',
    aliases: ['Noogenisis'],
    provenanceClass: 'NEO_SYNTHESIS',
    domains: ['genesis', 'mind', 'nature', 'future'],
    definition:
      'The emergence and development of intelligence, consciousness and shared knowledge into increasingly organized noospheric forms.',
    functionInNeoSystem:
      'Models the developmental side of the NEO System: how observations become knowledge, knowledge becomes organized intelligence, intelligence becomes coordinated action, and action feeds learning back into the living system.',
    questions: [
      'What new intelligence is emerging?',
      'Is complexity producing greater coherence or merely more information?',
      'How does individual learning become collective intelligence?',
      'Is technological growth remaining aligned with nature and stewardship?'
    ],
    related: ['NOOGONY', 'NOOLOGY', 'NOONE_SCIENCE', 'AFROFUTURISM', 'WORLD_CREDIT_CLOCK']
  }
]

export function noologicalDisciplineById(id: string): NoologicalDiscipline | undefined {
  const normalized = id.trim().toLowerCase()
  return noologicalDisciplines.find((item) =>
    item.id.toLowerCase() === normalized ||
    item.name.toLowerCase() === normalized ||
    item.aliases?.some((alias) => alias.toLowerCase() === normalized)
  )
}

export function searchNoologicalDisciplines(query: string): NoologicalDiscipline[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!terms.length) return noologicalDisciplines

  return noologicalDisciplines
    .map((item) => {
      const haystack = [
        item.id,
        item.name,
        ...(item.aliases ?? []),
        item.definition,
        item.functionInNeoSystem,
        ...item.domains,
        ...item.questions,
        ...item.related
      ].join(' ').toLowerCase()
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0)
      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .map(({ item }) => item)
}
