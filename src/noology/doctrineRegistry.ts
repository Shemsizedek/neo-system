export type DoctrineCategory =
  | 'MENTAL_PATTERN'
  | 'SOCIAL_NORM'
  | 'MEDITATION'
  | 'AFFIRMATION'
  | 'INSIGHT'
  | 'UNDERSTANDING'
  | 'REASON'
  | 'RATIONALE'
  | 'MORAL'
  | 'ETHIC'
  | 'PRINCIPLE'
  | 'NEO_PHILOSOPHY'

export type DoctrineEvidenceClass =
  | 'SOURCE_DERIVED'
  | 'NEO_SYNTHESIS'
  | 'OPERATIONAL_CONTROL'

export type NeoDoctrineRecord = {
  id: string
  category: DoctrineCategory
  title: string
  teaching: string
  operationalization: string
  evidenceClass: DoctrineEvidenceClass
  source?: {
    title: string
    pageOrSection?: string
    note?: string
  }
  tags: string[]
}

/**
 * Doctrine registry for NEO Algo.
 *
 * Source-derived entries preserve the conceptual frame of the supplied texts.
 * They are not automatically promoted to empirical, scientific, historical or
 * legal fact. NEO synthesis entries are explicit system interpretations.
 */
export const neoDoctrineRegistry: NeoDoctrineRecord[] = [
  {
    id: 'NDR-001',
    category: 'MENTAL_PATTERN',
    title: 'Conditioned Non-Questioning',
    teaching: 'Repeated institutional conditioning can train a person not to question inherited categories, contradictions or assumptions.',
    operationalization: 'When an answer relies heavily on convention, trigger an assumption audit and request the originating source, purpose and beneficiary of the convention.',
    evidenceClass: 'SOURCE_DERIVED',
    source: { title: 'Breaking The Spell', pageOrSection: 'Introduction / early discussion of religion, media and schooling' },
    tags: ['conditioning', 'education', 'media', 'authority', 'reasoning']
  },
  {
    id: 'NDR-002',
    category: 'MENTAL_PATTERN',
    title: 'Inversion Detection',
    teaching: 'A recurring danger is presenting what is harmful as beneficial or what is beneficial as harmful.',
    operationalization: 'Test labels against consequences: who gains, who loses, what happens to life, land, truth, continuity and future generations?',
    evidenceClass: 'SOURCE_DERIVED',
    source: { title: 'The Luciferian Conspiracy', pageOrSection: 'discussion of the Spell of Amam/Kingu' },
    tags: ['inversion', 'deception', 'consequence', 'ethics']
  },
  {
    id: 'NDR-003',
    category: 'PRINCIPLE',
    title: 'Right Knowledge → Right Action',
    teaching: 'Right knowledge, wisdom and overstanding are presented as producing right thinking, right words and right works.',
    operationalization: 'Require a traceable path from evidence to understanding to proposed action; do not allow action to bypass the reasoning record.',
    evidenceClass: 'SOURCE_DERIVED',
    source: { title: 'Breaking The Spell', pageOrSection: 'Right Knowledge discussion' },
    tags: ['knowledge', 'wisdom', 'overstanding', 'action']
  },
  {
    id: 'NDR-004',
    category: 'UNDERSTANDING',
    title: 'Knowledge Must Be Organized in Sequence',
    teaching: 'Knowledge becomes effective when placed in an organized sequence rather than accumulated as disconnected fragments.',
    operationalization: 'NEO Algo should build chronologies, dependency graphs and provenance chains before producing high-confidence synthesis.',
    evidenceClass: 'SOURCE_DERIVED',
    source: { title: 'Breaking The Spell', pageOrSection: 'Right Knowledge organizes and unifies the mind' },
    tags: ['sequence', 'chronology', 'organization', 'factology']
  },
  {
    id: 'NDR-005',
    category: 'NEO_PHILOSOPHY',
    title: 'Nine-Ether as Creative/Ordering Pole',
    teaching: 'Within the supplied NEO/Nuwaubian source tradition, Nine Ether is associated with life, creative force, reason, knowledge, wisdom and overstanding.',
    operationalization: 'Use Nine-Ether as a symbolic positive-polarity label for coherence, truthfulness, stewardship, reciprocity, creativity and nature alignment.',
    evidenceClass: 'NEO_SYNTHESIS',
    source: { title: 'Breaking The Spell / The Luciferian Conspiracy', pageOrSection: '6-Ether / 9-Ether discussions' },
    tags: ['nine-ether', 'creative-force', 'life', 'reason', 'symbolic-polarity']
  },
  {
    id: 'NDR-006',
    category: 'NEO_PHILOSOPHY',
    title: 'Six-Ether as Contractive/Disordering Pole',
    teaching: 'Within the supplied source tradition, Six Ether is associated with deception, disorder, compulsion and lower or contractive force.',
    operationalization: 'Use Six-Ether only as a symbolic system-state label for deceptive, coercive, fragmented or exploitative patterns; never use it as a biological classification of people.',
    evidenceClass: 'NEO_SYNTHESIS',
    source: { title: 'The Luciferian Conspiracy', pageOrSection: '6-Ether / 9-Ether discussions' },
    tags: ['six-ether', 'contraction', 'disorder', 'symbolic-polarity']
  },
  {
    id: 'NDR-007',
    category: 'PRINCIPLE',
    title: 'Dynamic Polarity, Not Static Dualism',
    teaching: 'Opposites can be modeled as interacting poles whose relation produces movement, balance, seasons and transformation.',
    operationalization: 'Map Yin/Yang and 6/9 as dynamic polarity metadata. Avoid treating either pole as a permanent identity assigned to a person or group.',
    evidenceClass: 'NEO_SYNTHESIS',
    tags: ['yin-yang', 'polarity', 'balance', 'cycle']
  },
  {
    id: 'NDR-008',
    category: 'ETHIC',
    title: 'Nature-Consequence Test',
    teaching: 'An action cannot be judged only by institutional permission; its effects on living systems, reciprocity and continuity must also be considered.',
    operationalization: 'Before action, record ecological, embodied, social, intergenerational and restorative consequences.',
    evidenceClass: 'OPERATIONAL_CONTROL',
    tags: ['nature', 'stewardship', 'consequence', 'future-generations']
  },
  {
    id: 'NDR-009',
    category: 'MEDITATION',
    title: 'Observe Before Naming',
    teaching: 'Observe the natural pattern, relationships, timing and consequences before imposing a label.',
    operationalization: 'Pause classification long enough to capture direct observations, provenance and uncertainty.',
    evidenceClass: 'NEO_SYNTHESIS',
    tags: ['observation', 'nature', 'attention', 'epistemology']
  },
  {
    id: 'NDR-010',
    category: 'AFFIRMATION',
    title: 'Truth, Sequence, Right Action',
    teaching: 'I seek right knowledge, place it in right sequence, test it through nature and consequence, and convert understanding into right action.',
    operationalization: 'Use as a pre-decision reflection prompt in NEO interfaces, not as a substitute for evidence.',
    evidenceClass: 'NEO_SYNTHESIS',
    tags: ['affirmation', 'decision', 'right-action']
  },
  {
    id: 'NDR-011',
    category: 'MORAL',
    title: 'Do Not Reproduce the Pattern You Oppose',
    teaching: 'A restorative system loses coherence if it reproduces deception, exploitation, erasure or coercion while claiming to correct them.',
    operationalization: 'Run every proposed remedy through reciprocity, proportionality, evidence, non-erasure and stewardship checks.',
    evidenceClass: 'OPERATIONAL_CONTROL',
    tags: ['restoration', 'ethics', 'reciprocity', 'coherence']
  },
  {
    id: 'NDR-012',
    category: 'REASON',
    title: 'Mental Revolution Before Mechanical Reaction',
    teaching: 'The supplied source tradition emphasizes knowledge, sound reason and mental/spiritual transformation before destructive reaction.',
    operationalization: 'Prefer research, education, provenance recovery, restorative accounting and lawful nonviolent remedies over impulsive escalation.',
    evidenceClass: 'SOURCE_DERIVED',
    source: { title: 'Breaking The Spell', pageOrSection: 'discussion of Right Knowledge, sound reason and mental/spiritual revolution' },
    tags: ['reason', 'nonviolence', 'learning', 'restoration']
  },
  {
    id: 'NDR-013',
    category: 'PRINCIPLE',
    title: 'Alchemy as Transformative Governance',
    teaching: 'Alchemy is used in NEO Algo as a disciplined transformation metaphor: decompose, separate, recombine, refine and embody.',
    operationalization: 'Every consequential action can pass through Calcination, Dissolution, Separation, Conjunction, Fermentation, Distillation and Coagulation.',
    evidenceClass: 'NEO_SYNTHESIS',
    source: { title: 'The Luciferian Conspiracy', pageOrSection: 'Tehuti/Thoth discussion identifies alchemy within the source tradition' },
    tags: ['alchemy', 'transmutation', 'governance', 'process']
  }
]

export const doctrineByCategory = (category: DoctrineCategory) =>
  neoDoctrineRegistry.filter((record) => record.category === category)

export const doctrineByTag = (tag: string) =>
  neoDoctrineRegistry.filter((record) => record.tags.includes(tag))
