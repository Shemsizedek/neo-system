import type { NeoLexiconSourceLayer } from './types'

export const firstLanguageSourceLayer: NeoLexiconSourceLayer = {
  id: 'NEO-LEX-SRC-001',
  title: 'First Language',
  sourceType: 'user-provided book',
  pageCount: 67,
  status: 'SOURCE-BOUND',
  provenancePolicy: 'Preserve source terminology and framing. Historical, linguistic, theological, ethnographic, and chronological assertions remain source claims unless separately verified.',
  entries: [
    ['FL-001','Language','term','The source treats language as a system for understanding and expressing the components and meanings of things.','pp. 1–4','SOURCE_DEFINITION',[],['distinguished_from:Tongue'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-002','Tongue','term',"The source uses 'tongue' for spoken language or a dialect spoken by a people.",'pp. 4–7','SOURCE_DEFINITION',[],['related_to:Language','related_to:Dialect'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-003','Dialect','term','A regional or derivative speech form connected to a broader language family.','pp. 5–7, 25–29','SOURCE_DEFINITION',[],['related_to:Tongue','related_to:Language'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-004','Aramic','language','The source presents Aramic/Aramaic as an ancient Semitic language and an ancestral source for later regional speech forms.','pp. 25–29, 73–78','SOURCE_CLAIM',['Aramaic'],['related_to:Syriac','related_to:Hebrew','related_to:Arabic'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-005','Ashuric/Syriac','language','A Semitic language layer identified by the source with Syriac and related regional dialects.','pp. 4–5, 23–29','SOURCE_CLAIM',['Syriac','Ashuric'],['related_to:Aramic'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-006','Hebrew','language','The source discusses Hebrew as a later dialect/language form within a broader Aramic/Semitic family.','pp. 6–8, 26–29, 76–78','SOURCE_CLAIM',[],['related_to:Aramic','related_to:Semitic'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-007','Arabic','language','The source treats Arabic as a later Semitic language related to Aramic/Ashuric traditions.','pp. 25–37, 53–67','SOURCE_CLAIM',[],['related_to:Aramic','related_to:Ashuric/Syriac','related_to:Kufic'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-008','Kufic','script','An early angular script tradition discussed in connection with Arabic writing.','pp. 32, 61–71','SOURCE_TERM',[],['used_for:Arabic','related_to:Cuneiform'],[],'DISPLAY_ONLY'],
    ['FL-009','Cuneiform','script','A wedge-shaped writing system impressed into clay; the source presents it as an ancient foundational script.','pp. 23–25, 83, 92–97, 112–119','SOURCE_DEFINITION',[],['used_by:Sumerian','used_by:Akkadian','related_to:Ugaritic'],[],'DISPLAY_ONLY'],
    ['FL-010','Ugaritic','language','A language/script tradition the source describes as combining cuneiform with another linguistic layer.','pp. 11–13, 86–87','SOURCE_CLAIM',[],['written_in:Cuneiform'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-011','Akkadian','language','A Semitic language associated with Akkad and cuneiform writing.','pp. 83, 96–97, 117–119','SOURCE_CLAIM',['Accadian'],['written_in:Cuneiform','related_to:Semitic'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-012','Sumerian','language','The source identifies Sumerian as an ancient language represented in cuneiform records.','pp. 24–25, 117–119','SOURCE_CLAIM',[],['written_in:Cuneiform'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-013','Hieroglyphics','script','A symbolic writing system using signs that may represent sounds, ideas, or images.','pp. 97–103','SOURCE_DEFINITION',['Egyptian Hieroglyphics'],['related_to:Hieratic','related_to:Demotic'],[],'DISPLAY_ONLY'],
    ['FL-014','Hieratic','script','A cursive Egyptian script shown by the source alongside hieroglyphic and demotic writing.','pp. 100–101','SOURCE_TERM',[],['related_to:Hieroglyphics','related_to:Demotic'],[],'DISPLAY_ONLY'],
    ['FL-015','Demotic','script','A later cursive Egyptian script shown by the source as part of the hieroglyphic/hieratic/demotic family.','pp. 100–101','SOURCE_TERM',[],['related_to:Hieroglyphics','related_to:Hieratic'],[],'DISPLAY_ONLY'],
    ['FL-016','Coptic','language','The source describes Coptic as a later Egyptian language written with a Greek-derived alphabet plus additional signs.','pp. 98–100','SOURCE_CLAIM',[],['related_to:Ancient Egyptian','written_in:Coptic alphabet'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-017','Sanskrit','language','A learned and sacred language of India discussed by the source in relation to older Indo-Aryan traditions.','pp. 22–23, 87–95','SOURCE_CLAIM',[],['related_to:Hindi','related_to:Indo-Aryan'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-018','Hindi','language','A modern Indo-Aryan language discussed in the book alongside Sanskrit and related South Asian language forms.','pp. 22–23, 87–95','SOURCE_TERM',[],['related_to:Sanskrit'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-019','Persian','language','A language and script tradition discussed in relation to later Qur\'anic manuscript traditions and regional writing systems.','pp. 60–67, 87–95','SOURCE_CLAIM',[],['related_to:Arabic script','related_to:Urdu'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-020','Urdu','language','A South Asian language shown in the source alongside Persian and discussed as connected to Indo-Aryan language development.','pp. 90–95','SOURCE_CLAIM',[],['related_to:Persian','related_to:Hindi'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-021','Nubic','language',"The source's chosen label for a Nubian language form, described as based on a Nubian cultural script style rather than simply equated with Arabic, Hebrew, Syriac, or Aramaic.",'p. 121','SOURCE_DEFINITION',['Nubian'],['associated_with:Nubia','associated_with:Kuwshites'],['Do not treat as independently verified linguistic classification without external verification.'],'SEMANTIC_SEED_ONLY'],
    ['FL-022','Huwa Symbol','symbol','A composite symbol the source says contains the numerals 1 through 9.','p. 32','SOURCE_CLAIM',['Huwa'],['related_to:Nine Ether'],[],'DISPLAY_ONLY'],
    ['FL-023','Nine Ether','term','A spiritual-symbolic concept associated by the source with the number 9.','pp. 32–35','SOURCE_DEFINITION',[],['related_to:Huwa Symbol'],['Symbolic concept only; must not be treated as cryptographic entropy or key strength.'],'SEMANTIC_SEED_ONLY'],
    ['FL-024','Root','term','The underlying origin or base form of a word used to interpret later forms and meanings.','pp. 2–3, 31','SOURCE_DEFINITION',[],['related_to:Etymology','related_to:Transliteration'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-025','Etymology','term',"The study of word origins and historical development; a core method implied throughout the book's root-based analysis.",'pp. 2–7, 25–31','SOURCE_DEFINITION',[],['related_to:Root'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-026','Transliteration','term','Representing a word or sound from one script in another script without necessarily translating its meaning.','pp. 4–7, 27–31','SOURCE_DEFINITION',[],['related_to:Script','related_to:Pronunciation'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-027','Script','term','A system of written signs used to represent language, sounds, or ideas.','pp. 19–24, 31–32, 61–71, 97–103','SOURCE_DEFINITION',[],['related_to:Language','related_to:Transliteration'],[],'DISPLAY_ONLY'],
    ['FL-028','One Language / One Speech','source_claim','The source argues that humanity once shared one language and one speech before later divisions into tongues and dialects.','pp. 46–53','SOURCE_CLAIM',[],['related_to:Language','related_to:Dialect'],['Store as a source claim; do not present as established historical fact.'],'NONE'],
    ['FL-029','Language Family Tree','source_claim','The source provides a chart relating elder scripts/languages to later forms such as Syriac, Arabic, Hebrew, Persian, Greek, Latin, and English.','pp. 30–31','SOURCE_CLAIM',[],['contains:Aramic','contains:Hebrew','contains:Arabic','contains:Syriac','contains:Persian'],["Preserve as the source's model; external linguistic verification is separate."],'NONE'],
    ['FL-030','Right Knowledge','term',"The source's label for knowledge grounded in what it presents as facts, roots, and corrected interpretations.",'pp. 2–3, 18, 39–45','SOURCE_DEFINITION',[],['related_to:Root','related_to:Language'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-031',"Ma'il Script",'script',"A slanting early Qur'anic script identified by the source.",'pp. 68–69','SOURCE_TERM',[],["used_for:Qur'anic manuscripts",'related_to:Kufic'],[],'DISPLAY_ONLY'],
    ['FL-032','Phoenician','script','An alphabetic tradition presented by the source as historically connected to later Semitic writing systems.','pp. 77–83, 111','SOURCE_CLAIM',[],['related_to:Semitic','related_to:Alphabet'],[],'DISPLAY_ONLY'],
    ['FL-033','Alphabet','term','A writing system made of letters/signs that represent sounds; the source contrasts alphabetic systems with pictorial or cuneiform systems.','pp. 31–32, 77–83, 97–101','SOURCE_DEFINITION',[],['related_to:Script'],[],'DISPLAY_ONLY'],
    ['FL-034','Pronunciation','term','How a spoken sound or word is articulated; treated by the source as part of distinguishing related languages and dialects.','pp. 4–7, 50–55','SOURCE_DEFINITION',[],['related_to:Tongue','related_to:Transliteration'],[],'SEMANTIC_SEED_ONLY'],
    ['FL-035','Symbol-to-Sound Mapping','term','The process of assigning written signs to spoken sounds, a principle discussed by the source in script development.','pp. 97–111','SOURCE_DEFINITION',[],['related_to:Hieroglyphics','related_to:Alphabet','related_to:Script'],[],'DISPLAY_ONLY']
  ].map(([id, canonicalTerm, entryType, plainLanguage, sourcePosition, sourceStatus, aliases, relations, restrictions, securityEligibility]) => ({
    id: id as string,
    canonicalTerm: canonicalTerm as string,
    entryType: entryType as any,
    plainLanguage: plainLanguage as string,
    sourcePosition: sourcePosition as string,
    sourceStatus: sourceStatus as any,
    aliases: aliases as string[],
    relations: relations as string[],
    restrictions: restrictions as string[],
    securityEligibility: securityEligibility as any
  }))
}

export const firstLanguageLexicon = firstLanguageSourceLayer.entries

export function findFirstLanguageEntry(query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) return undefined
  return firstLanguageLexicon.find(entry =>
    entry.canonicalTerm.toLowerCase() === needle ||
    entry.aliases.some(alias => alias.toLowerCase() === needle)
  )
}
