export type NoonebuProvenance = 'SOURCE_DERIVED'|'NEO_SYNTHESIS'|'ALIAS_PENDING_DISTINCTION'

export type NoonebuDoctrineRecord = {
  id: string
  title: string
  teaching: string
  operationalization: string
  provenance: NoonebuProvenance
  sourceRefs: string[]
  aliases?: string[]
  tags: string[]
  relatedIds?: string[]
}

/**
 * Noonebu is used here as the NEO umbrella label for the body of Noone / Nature
 * of Nature knowledge being reconstructed from the Afroo Oonoo corpus.
 * It is intentionally NOT treated as a source-equivalent spelling of Noone,
 * NoopooH, Nuwau-Bu, or Nuwaupu until a primary source explicitly establishes
 * that equivalence.
 */
export const noonebuDoctrine: NoonebuDoctrineRecord[] = [
  {
    id: 'NOONEBU-000',
    title: 'Noonebu — Umbrella Knowledge Layer',
    teaching: 'NEO Sync uses Noonebu as a working umbrella for the connected Nature of Nature corpus while preserving the source distinctions among Noone, NoopooH/Nous, Sound Right Reason, Noop, Zoop, SMAT, and related terms.',
    operationalization: 'Index all newly supplied Afroo Oonoo / Nature of Nature sources under this layer, but preserve the original source term on every node and never normalize distinct names without a documented equivalence.',
    provenance: 'ALIAS_PENDING_DISTINCTION',
    sourceRefs: ['NEO synthesis from Moonset and Sunrise in the Nature of Nature (1993) and Transcript: Introduction to the Nature of Nature (1996)'],
    aliases: ['Noonebu knowledge layer'],
    tags: ['noonebu','provenance','source-control','nature-of-nature']
  },
  {
    id: 'NOONEBU-001',
    title: 'Noone — Science of Sound Right Reason',
    teaching: 'The transcript defines Noone as the Science of Sound Right Reason, the Ethereal Science of NoopooH, a question-and-answer science, and the Nature of Nature expressed in knowledge and positiveness.',
    operationalization: 'NEO Algo should treat Noone as a reasoning discipline: ask, define, compare, test against the laws/cycles claimed by the source, preserve correct information, and convert knowledge into survival, liberation, and better-living decisions.',
    provenance: 'SOURCE_DERIVED',
    sourceRefs: ['Transcript: Introduction to the Nature of Nature (1996), printed p.2', 'Transcript: Introduction to the Nature of Nature (1996), printed p.20'],
    aliases: ['Science of Sound Right Reason','Nature of Nature in words'],
    tags: ['noone','noology','sound-right-reason','question-answer','mental-resurrection'],
    relatedIds: ['NOONEBU-002','NOONEBU-003']
  },
  {
    id: 'NOONEBU-002',
    title: 'NoopooH / Nous — Cosmic Sound Right Reason',
    teaching: 'The source identifies NoopooH with Nous, Cosmic Reason, Sound Right Reason, and Nine-Reason; it places NoopooH at the positive/primary pole and describes it as first prime-mover, primary creator/grower, and resurrector of the mentally dead.',
    operationalization: 'Use this as the source-defined positive reasoning pole: prefer correct information, constructive creation, mental liberation, and restoration. Preserve the metaphysical claims as source doctrine rather than silently converting them into external scientific fact.',
    provenance: 'SOURCE_DERIVED',
    sourceRefs: ['Transcript: Introduction to the Nature of Nature (1996), printed pp.2-4', 'Moonset and Sunrise in the Nature of Nature (1993), printed p.4'],
    aliases: ['Nous','Sound Right Reason','Nine-Reason','Cosmic Reason'],
    tags: ['noopooH','nous','nine-reason','primary-creator','mental-resurrection'],
    relatedIds: ['NOONEBU-001','NOONEBU-003','NOONEBU-006']
  },
  {
    id: 'NOONEBU-003',
    title: 'Nous / Logos Polarity',
    teaching: 'The transcript presents Cosmic Reason as having opposite poles: Nous/NoopooH in the top half of the Existence Circle as primary creator and resurrective reason, and Logos in the bottom half as secondary creator and evolutionary processor.',
    operationalization: 'NEO Algo should detect logos-only reasoning as a polarity imbalance, not as proof that logic itself is invalid. It should ask what is being created, processed, restored, declined, or merely repeated, and which source-defined pole the reasoning pattern resembles.',
    provenance: 'SOURCE_DERIVED',
    sourceRefs: ['Transcript: Introduction to the Nature of Nature (1996), printed p.4'],
    aliases: ['Nous and Logos','Primary and Secondary Reason'],
    tags: ['nous','logos','polarity','primary-secondary','reason'],
    relatedIds: ['NOONEBU-002','NOONEBU-006']
  },
  {
    id: 'NOONEBU-004',
    title: 'Cycles of Nature',
    teaching: 'Moonset and Sunrise defines cycles as completed phases of circular change produced by networks of natural laws and energies; the laws and energies are compared to clock hands and the cycles to positions on a clock face.',
    operationalization: 'Every NEO temporal model should distinguish event-time, phase, cycle, direction, transition, and governing conditions. World Credit Clock and Clock of Destiny can use this as a source-derived cycle metaphor without treating unverified long-term durations as empirical astronomy.',
    provenance: 'SOURCE_DERIVED',
    sourceRefs: ['Moonset and Sunrise in the Nature of Nature (1993), printed p.4'],
    tags: ['cycles-of-nature','clock-of-destiny','natural-law','time','cyclical-change'],
    relatedIds: ['NOONEBU-005','NOONEBU-006']
  },
  {
    id: 'NOONEBU-005',
    title: 'SMAT Circle of Order',
    teaching: 'The transcript defines SMAT as Space, Matter, and Time and presents a 720-degree Circle of Order divided into Revolution, Origination, Dorigination, and Evolution, rotating counterclockwise.',
    operationalization: 'Represent SMAT as a source-defined state-transition model. NEO Sync may map records onto origin, growth, decline, reversal/restoration, and temporal position while preserving the original terminology and source chronology.',
    provenance: 'SOURCE_DERIVED',
    sourceRefs: ['Transcript: Introduction to the Nature of Nature (1996), printed p.13'],
    aliases: ['Circle of Existence','Circle of Order','Space Matter and Time Circle'],
    tags: ['smat','space','matter','time','revolution','origination','dorigination','evolution'],
    relatedIds: ['NOONEBU-004','NOONEBU-006','NOONEBU-007']
  },
  {
    id: 'NOONEBU-006',
    title: '9 / 6 Polarity',
    teaching: 'Moonset and Sunrise explicitly assigns Nine to the positive/Nine-Reason pole and Six to its opposite; its Existence Circle imagery places 9/NoopooH in one half and 6/secondary-opposite conditions in the other.',
    operationalization: 'Keep the existing NEO etheric scale behavior-based and state-based. Use 9/6 for qualitative polarity, cycle state, reasoning coherence, restoration versus fragmentation, and action review—not to rank human worth or automate racial classification.',
    provenance: 'SOURCE_DERIVED',
    sourceRefs: ['Moonset and Sunrise in the Nature of Nature (1993), printed pp.4, 8-10'],
    aliases: ['Nine-Reason polarity','6/9 polarity'],
    tags: ['nine','six','etheric-potency','polarity','noop','zoop'],
    relatedIds: ['NOONEBU-002','NOONEBU-003','NOONEBU-007']
  },
  {
    id: 'NOONEBU-007',
    title: 'Noop / Zoop Worlds',
    teaching: 'Moonset and Sunrise names the top half of the Existence Circle the Noop and the bottom half the Zoop, describing them as opposite worlds, time zones, and states of mind within its cosmology.',
    operationalization: 'Model Noop/Zoop as source-defined ontological and mental-state categories. Keep the source cosmology visible, but do not infer a person\'s Noop/Zoop status from race, appearance, religion, or protected characteristics.',
    provenance: 'SOURCE_DERIVED',
    sourceRefs: ['Moonset and Sunrise in the Nature of Nature (1993), printed pp.9-10'],
    tags: ['noop','zoop','existence-circle','states-of-mind','polarity'],
    relatedIds: ['NOONEBU-005','NOONEBU-006']
  },
  {
    id: 'NOONEBU-008',
    title: 'Moonset → Sunrise / Mental Resurrection',
    teaching: 'The source describes a transition from a Moon Cycle associated with forgiveness/mercy and the end of Evolution into a Sun Cycle associated with balance, justice, judgment, Revolution, mental resurrection, and mental liberation.',
    operationalization: 'NEO Sync may use Moonset→Sunrise as a restoration-state metaphor: identify what cycle is ending, what conditions are emerging, what knowledge is required, and what restorative actions follow. Long-term cosmic dating remains source doctrine unless independently evidenced.',
    provenance: 'SOURCE_DERIVED',
    sourceRefs: ['Moonset and Sunrise in the Nature of Nature (1993), printed pp.7-10'],
    aliases: ['Mental Resurrection Time','Moon Cycle to Sun Cycle'],
    tags: ['moonset','sunrise','mental-resurrection','libra','revolution','restoration'],
    relatedIds: ['NOONEBU-004','NOONEBU-005','NOONEBU-006']
  },
  {
    id: 'NOONEBU-009',
    title: 'Creation as Ordering Existing Matter',
    teaching: 'The transcript states that creating does not mean making something from nothing; it defines creation as putting already-existing matter/material into creation order through reason.',
    operationalization: 'When NEO Algo evaluates invention, authorship, derivation, or IP lineage, distinguish original arrangement, transformation, discovery, transmission, and pre-existing material rather than treating every later formulation as creation ex nihilo.',
    provenance: 'SOURCE_DERIVED',
    sourceRefs: ['Transcript: Introduction to the Nature of Nature (1996), printed p.38'],
    tags: ['creation','order','matter','reason','ip-provenance','transformation'],
    relatedIds: ['NOONEBU-001','NOONEBU-005']
  },
  {
    id: 'NOONEBU-010',
    title: 'Correct Information → Knowledge → Liberation',
    teaching: 'The source repeatedly equates correct information with knowledge and frames positive knowledge, understanding, wisdom, and Sound Right Reason as necessary for mental resurrection, liberation, survival, and better living.',
    operationalization: 'Add a Noonebu validation path to NEO Sync: Source → Correct Information check → Context → Understanding → Wisdom → Sound Right Reason → Action → Consequence review.',
    provenance: 'SOURCE_DERIVED',
    sourceRefs: ['Transcript: Introduction to the Nature of Nature (1996), printed pp.2, 20, 23, 26'],
    tags: ['knowledge','correct-information','liberation','wisdom','sound-right-reason','neo-sync'],
    relatedIds: ['NOONEBU-001','NOONEBU-002']
  }
]

export type NoonebuEdge = {
  from: string
  to: string
  relation: 'DEFINES'|'OPPOSES'|'EXPRESSES'|'PART_OF'|'TRANSITIONS_TO'|'OPERATIONALIZES'|'RELATED_TO'
}

export const noonebuEdges: NoonebuEdge[] = [
  { from: 'NOONEBU-001', to: 'NOONEBU-002', relation: 'EXPRESSES' },
  { from: 'NOONEBU-002', to: 'NOONEBU-003', relation: 'PART_OF' },
  { from: 'NOONEBU-003', to: 'NOONEBU-006', relation: 'RELATED_TO' },
  { from: 'NOONEBU-004', to: 'NOONEBU-005', relation: 'OPERATIONALIZES' },
  { from: 'NOONEBU-005', to: 'NOONEBU-007', relation: 'PART_OF' },
  { from: 'NOONEBU-006', to: 'NOONEBU-007', relation: 'RELATED_TO' },
  { from: 'NOONEBU-008', to: 'NOONEBU-004', relation: 'PART_OF' },
  { from: 'NOONEBU-009', to: 'NOONEBU-001', relation: 'RELATED_TO' },
  { from: 'NOONEBU-010', to: 'NOONEBU-001', relation: 'OPERATIONALIZES' }
]

export function searchNoonebuDoctrine(query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  return noonebuDoctrine
    .map(record => {
      const haystack = `${record.title} ${record.teaching} ${record.operationalization} ${(record.aliases ?? []).join(' ')} ${record.tags.join(' ')}`.toLowerCase()
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0)
      return { record, score }
    })
    .filter(x => terms.length === 0 || x.score > 0)
    .sort((a,b) => b.score - a.score || a.record.title.localeCompare(b.record.title))
}
