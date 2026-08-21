import type { NeoDoctrineRecord } from './doctrineRegistry'

export const novusCodexDoctrineRecords: NeoDoctrineRecord[] = [
  {
    id: 'NCD-001',
    category: 'NEO_PHILOSOPHY',
    title: 'Natural Time / Nilotic Time',
    teaching: 'The Novus Codex presents time as continuous and calls for realignment of clocks and calendars with Nature, Nilotic observation and the sundial rather than arbitrary additions and subtractions of time units.',
    operationalization: 'When timing an NEO action, preserve observed natural-cycle context and identify whether the timestamp comes from Gregorian administration, Yamassic conversion, direct celestial observation or an ecclesiastical anchor.',
    evidenceClass: 'SOURCE_DERIVED',
    source: { title: 'The New Ethiopian Order (Novus Codex)', pageOrSection: 'pp. 497-505' },
    tags: ['natural-time', 'nilotic-time', 'calendar', 'sundial', 'world-credit-clock']
  },
  {
    id: 'NCD-002',
    category: 'PRINCIPLE',
    title: 'Time Is Continuous',
    teaching: 'The source rejects the idea that time itself is created by clock divisions and emphasizes continuity: one point ends as another begins.',
    operationalization: 'Do not treat daylight-saving changes, timezone labels or administrative date boundaries as alterations of the underlying natural process. Preserve both the administrative timestamp and the continuous-cycle interpretation.',
    evidenceClass: 'SOURCE_DERIVED',
    source: { title: 'The New Ethiopian Order (Novus Codex)', pageOrSection: 'pp. 506-510' },
    tags: ['continuous-time', 'reasoning', 'cycle', 'clock']
  },
  {
    id: 'NCD-003',
    category: 'UNDERSTANDING',
    title: 'Day / Shadow Polarity',
    teaching: 'The source describes a 38-Har circuit divided into 19 day Har and 19 shadow Har, with each phase flowing into the other.',
    operationalization: 'Represent day and shadow as complementary timing phases. Require an explicit local or ecclesiastical phase anchor before computing a live Har position.',
    evidenceClass: 'SOURCE_DERIVED',
    source: { title: 'The New Ethiopian Order (Novus Codex)', pageOrSection: 'pp. 502-507' },
    tags: ['day', 'shadow', 'polarity', 'yin-yang', 'six-nine', 'clock']
  },
  {
    id: 'NCD-004',
    category: 'PRINCIPLE',
    title: 'Nature Precedes Enacted Law',
    teaching: 'The Novus Codex states that Laws of Nature govern societies in a State of Nature and are prior to organized governments or enacted laws.',
    operationalization: 'In NEO analysis, distinguish natural-law doctrine, enacted public law, ecclesiastical law and institutional policy rather than collapsing them into one authority class.',
    evidenceClass: 'SOURCE_DERIVED',
    source: { title: 'The New Ethiopian Order (Novus Codex)', pageOrSection: 'pp. 546-547' },
    tags: ['natural-law', 'nature-of-nature', 'jurisdiction', 'law']
  },
  {
    id: 'NCD-005',
    category: 'NEO_PHILOSOPHY',
    title: 'Libra / Maat as Balance and Justice Cycle',
    teaching: 'The source interprets Libra/Maat as balance, scales, justice, equality, true law and order, and places it within a larger season-cycle framework.',
    operationalization: 'Use Libra/Maat as a source-derived symbolic cycle marker for balance, proportionality, reciprocity, justice and restorative review; do not treat symbolic cycle claims as astronomical measurements unless separately observed.',
    evidenceClass: 'SOURCE_DERIVED',
    source: { title: 'The New Ethiopian Order (Novus Codex)', pageOrSection: 'pp. 549-553' },
    tags: ['libra', 'maat', 'balance', 'justice', 'cycle', 'restoration']
  },
  {
    id: 'NCD-006',
    category: 'PRINCIPLE',
    title: 'Right Knowledge → Sound Right Reasoning',
    teaching: 'The source states that Right Knowledge, Right Wisdom and Right Overstanding lead to Sound Right Reasoning.',
    operationalization: 'Require evidence capture, contextual understanding and synthesis before NEO Algo promotes a conclusion into an action recommendation.',
    evidenceClass: 'SOURCE_DERIVED',
    source: { title: 'The New Ethiopian Order (Novus Codex)', pageOrSection: 'pp. 541-544' },
    tags: ['right-knowledge', 'wisdom', 'overstanding', 'sound-right-reasoning', 'noology']
  }
]

export function searchNovusCodexDoctrine(query: string): NeoDoctrineRecord[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
  return novusCodexDoctrineRecords
    .map((record) => {
      const haystack = `${record.title} ${record.teaching} ${record.tags.join(' ')}`.toLowerCase()
      const score = terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0)
      return { record, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ record }) => record)
}
