export type TemplistEvidenceClass = 'SOURCE_DERIVED' | 'SYMBOLIC_METAPHYSICAL' | 'OPERATIONAL_CONTROL'

export type TemplistTeaching = {
  id: string
  number: number
  multiplier: number
  title: string
  teaching: string
  operationalization: string
  evidenceClass: TemplistEvidenceClass
  tags: string[]
  sourcePage: number
}

export const templistSource = {
  title: 'The Templist Scroll',
  author: 'Dr. Lawiy-Zodok Shamu-El',
  institution: 'Nu Unified Temple / Temple Lodge #1-19'
} as const

export const templistNineDimensionalProgram = [
  'A Sound Mind','A Clean Soul','A Holy Spirit','A Clear Conscience','An Honest Heart',
  'A Caring Person','A Caring Personality','A Loyal Being','A Healthy Body In A Sound Environment'
] as const

export const templistKeys = [
  { key: 'Precept 101', domain: 'Natural Science', element: 'Water' },
  { key: 'Percept 101', domain: 'Philosophical Studies', element: 'Air' },
  { key: 'Intell 101', domain: 'All Laws', element: 'Fire' },
  { key: 'Info 101', domain: 'Correct Information', element: 'Earth' }
] as const

const raw: Array<Omit<TemplistTeaching,'id'|'multiplier'>> = [
  {number:1,title:'Reciprocal Temple Recognition',teaching:'Treat self and others as temples and apply the Golden Rule under like conditions.',operationalization:'Before action, test reciprocity: would the rule remain acceptable if roles were reversed under the same conditions?',evidenceClass:'OPERATIONAL_CONTROL',tags:['reciprocity','golden-rule','temple'],sourcePage:32},
  {number:2,title:'Temple Balance and Cleanliness',teaching:'Maintain the temple inside and out in balance (Maat); cleanliness is linked with wholeness.',operationalization:'Add maintenance, hygiene, environmental quality and balance checks to embodied and institutional systems.',evidenceClass:'SOURCE_DERIVED',tags:['maat','balance','cleanliness','wholeness'],sourcePage:32},
  {number:3,title:'Information as Temple Nourishment',teaching:'Keep the temple informed through information, outformation and mid-formation.',operationalization:'Track evidence, counter-evidence and unresolved material instead of retaining only confirming information.',evidenceClass:'SOURCE_DERIVED',tags:['information','outformation','mid-formation','knowledge'],sourcePage:33},
  {number:4,title:'Response-Ability',teaching:'Life is the home of the Templist; the temple reflects response-ability and interconnectedness.',operationalization:'Evaluate agency by identifying what the actor can responsibly influence rather than only assigning blame.',evidenceClass:'OPERATIONAL_CONTROL',tags:['responsibility','interconnection','agency'],sourcePage:33},
  {number:5,title:'Multicultural Synthesis',teaching:'The temple is formed from many contributors and cultures; unity is cultivated through learning and communication.',operationalization:'Preserve provenance of each contributing tradition while allowing explicit synthesis.',evidenceClass:'SOURCE_DERIVED',tags:['multicultural','syncretism','unity','provenance'],sourcePage:34},
  {number:6,title:'Rhythm and Energy Pattern',teaching:'The Templist studies rhythm, breath, energy patterns and language as modes of attunement.',operationalization:'Model rhythm and energetic language as qualitative observation fields, not automatic empirical proof.',evidenceClass:'SYMBOLIC_METAPHYSICAL',tags:['rhythm','energy','breath','language'],sourcePage:34},
  {number:7,title:'Organized Temple Governance',teaching:'The temple should be organized like the body, with representation and peaceful order.',operationalization:'Prefer distributed representation, clear functions and peaceful governance structures.',evidenceClass:'OPERATIONAL_CONTROL',tags:['governance','organization','peace','representation'],sourcePage:35},
  {number:8,title:'Shadow-Hour Regeneration',teaching:'Darkness and shadow hours are framed as periods of rest, healing and regeneration.',operationalization:'Treat rest and recovery as first-class cycle states in the Clock of Destiny.',evidenceClass:'SYMBOLIC_METAPHYSICAL',tags:['shadow-hours','rest','regeneration','cycle'],sourcePage:35},
  {number:9,title:'Wholeness Through Balance',teaching:'Correctness is completeness; wholeness joins right and left paths in balance (Maat).',operationalization:'Avoid false binaries; identify complementary poles and seek coherent integration.',evidenceClass:'OPERATIONAL_CONTROL',tags:['wholeness','maat','polarity','integration'],sourcePage:36},
  {number:10,title:'Cosmic Dance Practice',teaching:'Daily, weekly and monthly embodied ritual is presented as a way to connect, heal and attune.',operationalization:'Represent ritual as an optional embodied-practice layer with cadence and self-reported effects.',evidenceClass:'SYMBOLIC_METAPHYSICAL',tags:['ritual','dance','cadence','embodiment'],sourcePage:36},
  {number:11,title:'Decode the Messages',teaching:'The Templist is trained to notice messages, codes, language and the energetic effect of words.',operationalization:'Apply semiotic analysis while distinguishing observation, interpretation and inference.',evidenceClass:'OPERATIONAL_CONTROL',tags:['semiotics','language','codes','words'],sourcePage:37},
  {number:12,title:'Imagination and Visual Craft',teaching:'Study imagination, calligraphy, handwriting, hieroglyphs, art and experimentation.',operationalization:'Use visualization and creative prototyping as hypothesis-generation tools, not substitutes for verification.',evidenceClass:'SOURCE_DERIVED',tags:['imagination','art','visualization','experimentation'],sourcePage:38},
  {number:13,title:'Music as Energy Literacy',teaching:'Study and produce music; sound is treated as a carrier of meaning, rhythm and energy.',operationalization:'Include sound, rhythm and acoustic context as qualitative sensory data when relevant.',evidenceClass:'SOURCE_DERIVED',tags:['music','sound','rhythm','energy'],sourcePage:38},
  {number:14,title:'Nature Sound Attunement',teaching:'Attend to sounds and patterns of nature and their effects on mood and mental state.',operationalization:'Permit observed soundscape and mood correlations while preserving uncertainty and avoiding causal overclaim.',evidenceClass:'SOURCE_DERIVED',tags:['nature','sound','mood','frequency'],sourcePage:39},
  {number:15,title:'Appearance as Communication',teaching:'Dress and presentation communicate self-respect, identity and intention.',operationalization:'Treat appearance as contextual communication, never as a measure of human worth.',evidenceClass:'OPERATIONAL_CONTROL',tags:['appearance','communication','respect'],sourcePage:40},
  {number:16,title:'Language Shapes Perception',teaching:'Language publishes the thoughts and perceptions of the mind; expand language to express experience.',operationalization:'Encourage precise vocabulary, neology and multilingual context where existing terms erase distinctions.',evidenceClass:'SOURCE_DERIVED',tags:['language','neology','perception','communication'],sourcePage:40},
  {number:17,title:'Conduct by Conditions of Nature',teaching:'Codes of conduct should respond to conditions of nature and encourage reasoning beyond inherited social definitions.',operationalization:'Make context, conditions and consequences explicit inputs to ethical reasoning.',evidenceClass:'OPERATIONAL_CONTROL',tags:['conduct','nature','context','reason'],sourcePage:41},
  {number:18,title:'Sovereignty Through Peace, Protection and Prosperity',teaching:'Clarify sovereignty through peace, protection and prosperity; TEMPLE means Teaching, Empowering, Motivating, Prospering, Learning, Elevating.',operationalization:'Score institutional programs on peacefulness, protection, capability-building, learning and sustainable prosperity.',evidenceClass:'OPERATIONAL_CONTROL',tags:['sovereignty','peace','protection','prosperity','TEMPLE'],sourcePage:41},
  {number:19,title:'Mastery Becomes Guidance',teaching:'Temple mastery carries a duty to guide others and preserve personal and collective records.',operationalization:'Require mature knowledge systems to produce teachable provenance, records and mentorship rather than gatekeeping.',evidenceClass:'OPERATIONAL_CONTROL',tags:['mastery','guidance','records','mentorship'],sourcePage:42}
]

export const templistTeachings: TemplistTeaching[] = raw.map((item) => ({...item,id:`TPL-${String(item.number).padStart(3,'0')}`,multiplier:item.number*19}))

export const ethic9 = {
  title:'Ethic-9 / Nine Ethics',
  definition:'The source defines Ethic-9 as the science of study and teaching of positive perfection in thought, speech and activity by way of Sound Right Reason.',
  controls:['thought','speech','activity','sound-right-reason','role-model-accountability']
} as const

export const sacredAffirmations = [
  'I am in the Love of the All and All love is in me.',
  'I am a part of the All and the All is a part of me.',
  'I am one with the All and the All is one with me.',
  'I can succeed as a part of the All and fail as an individual.',
  'I can be All that I wish in The All as long as my wish is to stay in the All.',
  'I am never alone.','The All is.','I am.','The All can.','I can.','The All does.','I do.'
] as const

export const templistDegrees = [
  'Temple Apprentice','Temple Craft','Master Templist','Sacred Temple Master','Perfect Temple Master','Templist Secretary','Templist Judge','Intendment of Temple','Elite 9 Templist','Elite 6 Templist','Elite 3 Templist','Master Temple Architect','Royal Temple Arch','Elite Temple Perfectionist','Temple Scribe','Temple Prince of Nun','Temple of East & West Knights','Templist Knight of Mir','Pontiff Templist','Master Temple of Symbols','Temple Knight','Templist Knight of Royal Arch','Chief of Tabernacle','Temple Prince of Tabernacle','Templist Knight of Royal Bronze','Temple Prince of Knights','Knight Commander of Temple','Adept Templist','Prince Adept Templist','Sun Adept Templist','Master Templist Adept','Templist Knight of Holy land','Sub Templist Prince','Supreme Council','Supreme Elite Council','Sovereign Grand Master'
] as const

export function searchTemplistDoctrine(query:string):TemplistTeaching[]{
  const terms=query.toLowerCase().split(/\s+/).filter(Boolean)
  return templistTeachings.map(t=>({t,score:terms.reduce((s,x)=>s+(t.title.toLowerCase().includes(x)?4:0)+(t.teaching.toLowerCase().includes(x)?2:0)+(t.tags.some(tag=>tag.includes(x))?3:0),0)})).filter(x=>!terms.length||x.score>0).sort((a,b)=>b.score-a.score).map(x=>x.t)
}
