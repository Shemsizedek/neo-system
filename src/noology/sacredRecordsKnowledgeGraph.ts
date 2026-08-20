export type SacredGraphNodeType =
  | 'SOURCE'
  | 'PERSON'
  | 'PEOPLE'
  | 'PLACE'
  | 'INSTITUTION'
  | 'DOCUMENT'
  | 'SYMBOL'
  | 'CONCEPT'
  | 'EVENT'
  | 'METHOD'

export type SacredGraphRelation =
  | 'SOURCE_IDENTIFIES_AS'
  | 'SOURCE_ASSERTS_ANCESTRY'
  | 'SOURCE_ASSERTS_DESCENT'
  | 'SOURCE_ASSERTS_MIGRATION'
  | 'SOURCE_ASSERTS_ORIGIN'
  | 'SOURCE_ASSERTS_INFLUENCE'
  | 'SOURCE_ASSERTS_SUCCESSION'
  | 'SOURCE_ASSOCIATES_WITH'
  | 'SOURCE_ASSOCIATES_SYMBOL_WITH'
  | 'SOURCE_COMPARES_SYMBOL_WITH'
  | 'SOURCE_LOCATES_IN'
  | 'SOURCE_DESCRIBES_EVENT'
  | 'SOURCE_CITES'
  | 'SOURCE_USES_AS_EVIDENCE'
  | 'PART_OF'
  | 'RELATED_TO'

export type SacredGraphEvidenceStatus =
  | 'SOURCE_STATEMENT'
  | 'SOURCE_HISTORICAL_CLAIM'
  | 'SOURCE_SYMBOLIC_CLAIM'
  | 'SOURCE_GENEALOGY_CLAIM'
  | 'SOURCE_MIGRATION_CLAIM'
  | 'SOURCE_METHOD'

export type SacredGraphNode = {
  id: string
  type: SacredGraphNodeType
  name: string
  aliases?: string[]
  summary: string
  tags: string[]
  sourcePages: number[]
  sensitiveClassification?: boolean
}

export type SacredGraphEdge = {
  id: string
  from: string
  to: string
  relation: SacredGraphRelation
  status: SacredGraphEvidenceStatus
  summary: string
  sourcePages: number[]
  tags: string[]
}

/**
 * Source-bound knowledge graph extracted from the substantive pages of
 * "Let's Set The Record Straight!", which identifies itself as an excerpt from
 * "The Sacred Records Of The Moor".
 *
 * IMPORTANT: Edges record what the source says. They are not silently promoted
 * to independent historical, legal, scientific or biological fact.
 * Racial/genetic classifications that appear in the book are preserved only as
 * source material and are never used to classify real people or determine human
 * worth, rights, superiority, inferiority or eligibility.
 */
export const sacredRecordsGraphNodes: SacredGraphNode[] = [
  { id:'SRC-RECORD', type:'SOURCE', name:"Let's Set The Record Straight!", aliases:['The Sacred Records Of The Moor excerpt'], summary:'Source work that states its purpose is to set the records straight through records, documents and comparative historical inquiry.', tags:['source','sacred-records','factology'], sourcePages:[14,15,16] },
  { id:'MTH-FACTOLOGY', type:'METHOD', name:'Document-Producing Factology', summary:'Method stated in the introduction: test names and historical claims through records, ancient documents, images, tablets, carvings, engravings and scriptures.', tags:['factology','records','documents','research'], sourcePages:[15,16] },
  { id:'PER-YORK', type:'PERSON', name:'Malachi Z. York-El', aliases:['Rev. Dr. Malachi Z. York-El','Dr. Malachi Z. York'], summary:'Authorial/teaching figure identified throughout the work and associated with the Nuwaubian/Nuwaupu framework.', tags:['author','teacher','nuwaubian'], sourcePages:[4,5,6,7,8,16,17,18,19,20,21,22,23,24,25] },
  { id:'PER-CHARLES-TINSLEY', type:'PERSON', name:'Charles Tinsley', summary:'Named in the dedication as a Masonic mentor/friend connected to King Solomon’s Lodge No. 4.', tags:['freemasonry','dedication'], sourcePages:[3] },
  { id:'PER-BEN-YORK', type:'PERSON', name:'Ben York', summary:'Figure in the source genealogy, identified as part of York’s family line and linked by the source to Moorish/Malian ancestry.', tags:['genealogy','york-family','moors'], sourcePages:[27,28,29,30] },
  { id:'PER-YUSUF-BEN-ALI', type:'PERSON', name:'Yusuf Ben Ali', aliases:['Old York'], summary:'Named by the source as an ancestor in the York family line.', tags:['genealogy','york-family'], sourcePages:[27,29] },
  { id:'PER-MANSA-MUSA', type:'PERSON', name:'Mansa Musa', summary:'Malian ruler used by the source in its transatlantic and Moorish genealogy narrative.', tags:['mali','migration','genealogy'], sourcePages:[30,31] },
  { id:'PER-ABU-BAKARI', type:'PERSON', name:'Abu Bakari', summary:'Named in the source narrative as Mansa Musa’s half-brother and as a figure tied to Atlantic travel claims.', tags:['mali','migration','atlantic'], sourcePages:[30,31] },
  { id:'PER-BILAL', type:'PERSON', name:'Bilal', summary:'Named by the source in Idrisid/Maghrebi genealogy and manuscript transmission claims.', tags:['idrisid','morocco','genealogy'], sourcePages:[30] },
  { id:'PER-MUHAMMAD', type:'PERSON', name:'Muhammad', aliases:['Prophet Muhammad'], summary:'Referenced extensively in the source’s religious and genealogy discussions.', tags:['islam','genealogy'], sourcePages:[67,68,69,70] },
  { id:'PER-AISHA', type:'PERSON', name:"A’yisha", aliases:['Aisha'], summary:'Referenced in the source’s genealogy discussion concerning Muhammad and Abu Bakr.', tags:['islam','genealogy'], sourcePages:[68,69,70] },
  { id:'PER-ABU-BAKR', type:'PERSON', name:'Abu Bakr', summary:'Referenced in the source’s lineage narrative and paired with A’yisha.', tags:['islam','genealogy'], sourcePages:[68,69,70] },
  { id:'PER-ALI-ABBAS', type:'PERSON', name:'As Sayyid Ali Abbas', summary:'Shown and quoted in the source’s discussion of early Arabic descriptions and family appearance.', tags:['arabic-source','genealogy'], sourcePages:[69,70] },
  { id:'PER-GENGHIS', type:'PERSON', name:'Genghis Khan', aliases:['Temujin'], summary:'Presented in a source section on Mongol history, conquest and succession.', tags:['mongol','history','succession'], sourcePages:[81,82] },
  { id:'PER-ESAU', type:'PERSON', name:'Esau', aliases:['Edom'], summary:'Central biblical/genealogical figure in a long source section on Edomites and descendant groups.', tags:['genealogy','edom','bible'], sourcePages:[82,83,84,85,88,89,93,109,110,111,112,113,114,115] },
  { id:'PER-CANAAN', type:'PERSON', name:'Canaan', aliases:['Libana'], summary:'Central source genealogy figure whose descendants are mapped into Canaanite tribes.', tags:['genealogy','canaanites'], sourcePages:[85,86,87,95,96,97,98,99,100,101,102,103,104,105,106,107,108] },
  { id:'PER-SIDON', type:'PERSON', name:'Sidon', summary:'Presented as a son of Canaan and associated by the source with Phoenicians/Sidonites.', tags:['genealogy','phoenicians'], sourcePages:[96,97,99] },
  { id:'PER-HETH', type:'PERSON', name:'Heth', summary:'Presented as a son of Canaan and linked by the source to Hittites.', tags:['genealogy','hittites'], sourcePages:[96,97,100,101] },
  { id:'PER-JEBUS', type:'PERSON', name:'Jebus', summary:'Presented as a son of Canaan and linked by the source to Jebusites.', tags:['genealogy','jebusites'], sourcePages:[97,101] },
  { id:'PER-AMOR', type:'PERSON', name:'Amor', summary:'Presented as a son of Canaan and linked by the source to Amorites.', tags:['genealogy','amorites'], sourcePages:[97,102,103] },
  { id:'PER-GIRGASH', type:'PERSON', name:'Girgash', summary:'Presented as a son of Canaan and linked by the source to Girgashites.', tags:['genealogy','canaanites'], sourcePages:[98,104] },
  { id:'PER-HIVIY', type:'PERSON', name:'Hiviy', aliases:['Hivi','Hivite'], summary:'Presented as a son of Canaan and linked by the source to Hivites/Hurrians.', tags:['genealogy','hivites'], sourcePages:[98,104,105] },
  { id:'PER-ARKI', type:'PERSON', name:'Arki', aliases:['Arkite'], summary:'Presented as a son of Canaan and mapped by the source into later peoples.', tags:['genealogy','arkite'], sourcePages:[98,105] },
  { id:'PER-SINI', type:'PERSON', name:'Sini', aliases:['Sinite'], summary:'Presented as a son of Canaan and linked by the source to a regional genealogy.', tags:['genealogy','sinite'], sourcePages:[98,106] },
  { id:'PER-ARVAD', type:'PERSON', name:'Arvad', aliases:['Arvadite'], summary:'Presented as a son of Canaan and linked by the source to northern Syria and seafaring groups.', tags:['genealogy','arvadite'], sourcePages:[99,106,107] },
  { id:'PER-ZEMAR', type:'PERSON', name:'Zemar', aliases:['Zemarite'], summary:'Presented as a son of Canaan and linked by the source to Syrian/Lebanese regions.', tags:['genealogy','zemarite'], sourcePages:[99,107] },
  { id:'PER-HAMMATH', type:'PERSON', name:'Hammath', summary:'Presented as the youngest son in the source’s Canaan genealogy and linked to Hamathite groups.', tags:['genealogy','hamathite'], sourcePages:[99,108] },
  { id:'PER-MUSA-NOSEYR', type:'PERSON', name:'Musa son of Noseyr', aliases:['Musa ibn Nusayr'], summary:'Governor of North Africa in the source’s account of the Moorish entry into Iberia.', tags:['moors','andalusia','north-africa'], sourcePages:[122,123] },
  { id:'PER-TARIF', type:'PERSON', name:"Tarif ibn Zar’a ibn Abi Mudri", summary:'Named as an early raiding commander in the source’s account of entry into Iberia.', tags:['moors','andalusia'], sourcePages:[122,123] },
  { id:'PER-TARIK', type:'PERSON', name:'Tarik ibn Ziyad', aliases:['Tariq ibn Ziyad'], summary:'Named as the commander who crossed into Iberia and defeated the Visigoth army in the source narrative.', tags:['moors','andalusia','gibraltar'], sourcePages:[123,124] },
  { id:'PER-KING-FAROUK', type:'PERSON', name:'King Farouk I', summary:'Shown in connection with a Freemasonic lodge in Cairo.', tags:['egypt','freemasonry'], sourcePages:[137] },
  { id:'PER-NASSER', type:'PERSON', name:'Gamal Abdel Nasser', summary:'Referenced by the source in a discussion of Egyptian Freemasonry/Shriners.', tags:['egypt','freemasonry'], sourcePages:[138] },
  { id:'PER-SADAT', type:'PERSON', name:'Muhammad Anwar Al Sadat', summary:'Referenced by the source in a discussion of Egyptian Freemasonry/Shriners.', tags:['egypt','freemasonry'], sourcePages:[138] },

  { id:'PEO-MOORS', type:'PEOPLE', name:'Moors', aliases:['Malians','Moorish'], summary:'Core identity category in the source, connected to Mali, North Africa, Iberia, symbols, institutions and Indigenous-American comparisons.', tags:['moors','malians','identity'], sourcePages:[14,15,16,24,25,29,30,31,37,38,60,87,109,118,120,121,122,123,124,125,126,132,138,139,142] },
  { id:'PEO-NUWBUNS', type:'PEOPLE', name:'Nuwbuns', aliases:['Nuwaubians','Nuwba'], summary:'Source identity/origin category connected to Africa, migration and Olmec narratives.', tags:['nuwbuns','nuwaubians','origin'], sourcePages:[30,31,32,33,46,47,67,68,72,73] },
  { id:'PEO-OLMECS', type:'PEOPLE', name:'Olmecs', summary:'Major source category in comparative Africa-America history, archaeology, art and migration claims.', tags:['olmecs','america','pre-columbian'], sourcePages:[32,33,41,42,45,46,47,48,49,50,51,52,53,54,57,58,59,60,61,62,63,64,72,73,74,75,76,116,117] },
  { id:'PEO-DOGON', type:'PEOPLE', name:'Dogon', summary:'Presented as a Mali people connected by the source to Sirius knowledge, ritual and transatlantic continuity.', tags:['dogon','mali','sirius','ritual'], sourcePages:[73,74,75,76,116,119] },
  { id:'PEO-HOPI', type:'PEOPLE', name:'Hopi', summary:'Native American people linked by the source to Dogon customs, ceremonial practices and symbol continuity.', tags:['hopi','native-american','ceremony'], sourcePages:[74,76,89,116,118,119] },
  { id:'PEO-MAYA', type:'PEOPLE', name:'Maya', summary:'Source category linked to Olmec inheritance, migration, Cambodia/Angkor comparisons and calendrical/architectural parallels.', tags:['maya','mesoamerica','angkor'], sourcePages:[75,76,77,78,79,80] },
  { id:'PEO-IROQUOIS', type:'PEOPLE', name:'Iroquois', aliases:['Haudenosaunee'], summary:'Source category linked to trade, governance, Six Nations and constitutional-genealogy claims.', tags:['iroquois','indigenous-law','constitution'], sourcePages:[116,128,129,130,131] },
  { id:'PEO-SIX-NATIONS', type:'PEOPLE', name:'Six Nations of the Iroquois Confederacy', summary:'Governance body identified by the source in its Great Law of Peace and constitutional-genealogy discussion.', tags:['iroquois','six-nations','governance'], sourcePages:[128,129,130] },
  { id:'PEO-OSAGE', type:'PEOPLE', name:'Osage', summary:'Native American people connected by the source to star-and-crescent symbolism.', tags:['osage','symbolism','native-american'], sourcePages:[118,120,121] },
  { id:'PEO-NAVAJO', type:'PEOPLE', name:'Navajo', summary:'Native American people connected by the source to inverted-crescent symbolism.', tags:['navajo','symbolism','native-american'], sourcePages:[118,121] },
  { id:'PEO-IDRISIDS', type:'PEOPLE', name:'Idrisids', summary:'Moorish/Maghrebi dynasty discussed by the source in relation to Morocco and lineage.', tags:['idrisids','morocco','dynasty'], sourcePages:[29,30] },
  { id:'PEO-PHOENICIANS', type:'PEOPLE', name:'Phoenicians', summary:'Source identifies Sidonites/Phoenicians as maritime traders and colonial actors in the Mediterranean.', tags:['phoenicians','sidon','trade'], sourcePages:[60,96] },
  { id:'PEO-HITTITES', type:'PEOPLE', name:'Hittites', summary:'Source descendant/tribal category linked to Heth and Anatolia.', tags:['hittites','anatolia','genealogy'], sourcePages:[100,101,103] },
  { id:'PEO-CANAANITES', type:'PEOPLE', name:'Canaanites', summary:'Major source genealogy category built from the eleven sons of Canaan/Libana.', tags:['canaanites','genealogy'], sourcePages:[85,86,87,88,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109] },
  { id:'PEO-MONGOLS', type:'PEOPLE', name:'Mongols', summary:'Source category tied to Genghis Khan and also used within older racialized migration narratives in the book.', tags:['mongols','genghis','migration'], sourcePages:[74,81,82,89,93,103,104], sensitiveClassification:true },

  { id:'PLC-AFRICA', type:'PLACE', name:'Africa', summary:'Primary geographic origin and movement zone in numerous source narratives.', tags:['africa','origin','migration'], sourcePages:[28,29,31,32,41,46,51,64,66,67,91,92,109,117] },
  { id:'PLC-MALI', type:'PLACE', name:'Mali', summary:'Source homeland/context for Mansa Musa, Abu Bakari and Dogon narratives.', tags:['mali','moors','dogon'], sourcePages:[29,30,31,73] },
  { id:'PLC-MOROCCO', type:'PLACE', name:'Morocco', aliases:['Maghreb'], summary:'Source node for Idrisid history, Moorish identity and later cultural exchange.', tags:['morocco','maghreb','moors'], sourcePages:[28,29,30,60,87,124] },
  { id:'PLC-AMERICA', type:'PLACE', name:'America', aliases:['North America','South America'], summary:'Primary destination/setting in source migration, Indigenous, Olmec and constitutional narratives.', tags:['america','migration','indigenous'], sourcePages:[23,28,31,32,36,37,38,41,46,47,54,58,63,64,66,67,72,73,109,116,117,118,128,129,130] },
  { id:'PLC-MEXICO', type:'PLACE', name:'Mexico', summary:'Mesoamerican location in Olmec/Maya and symbol/architecture comparisons.', tags:['mexico','olmec','maya'], sourcePages:[54,57,63,73,76,79] },
  { id:'PLC-PERU', type:'PLACE', name:'Peru', summary:'South American location used in source engineering/agriculture comparisons.', tags:['peru','engineering','agriculture'], sourcePages:[57,62,63] },
  { id:'PLC-CAMBODIA', type:'PLACE', name:'Cambodia', aliases:['Kampuchea','Angkor'], summary:'Source comparison point for Maya/Angkor architecture and migration narratives.', tags:['cambodia','angkor','maya'], sourcePages:[76,77,78,79,80] },
  { id:'PLC-SPAIN', type:'PLACE', name:'Spain', aliases:['Iberia','Andalusia'], summary:'Central setting of the source’s Moorish conquest and cultural-development narrative.', tags:['spain','andalusia','moors'], sourcePages:[37,38,60,118,122,123,124,125,126] },
  { id:'PLC-CAIRO', type:'PLACE', name:'Cairo, Egypt', summary:'Location used in the source’s Freemasonry/Egypt institutional comparison.', tags:['cairo','egypt','freemasonry'], sourcePages:[137,138] },

  { id:'DOC-GREAT-LAW', type:'DOCUMENT', name:'Great Law of Peace', aliases:['Iroquois Oral Constitution','Kayenhla Kowa'], summary:'Indigenous constitutional source that the book argues predates and influenced the U.S. Constitution.', tags:['great-law-of-peace','iroquois','constitution'], sourcePages:[128,130] },
  { id:'DOC-US-CONSTITUTION', type:'DOCUMENT', name:'United States Constitution', summary:'Compared by the source to the Iroquois Great Law of Peace.', tags:['constitution','united-states'], sourcePages:[128,130,131] },
  { id:'DOC-DECLARATION', type:'DOCUMENT', name:'Declaration of Independence', summary:'Quoted at the beginning of the source introduction as a rights/governance framing device.', tags:['rights','government','declaration'], sourcePages:[14] },
  { id:'DOC-BOOK-ELDERS', type:'DOCUMENT', name:'The Book of Elders, The Life Stories & Wisdom Of Great American Indians', summary:'Quoted as supporting material in the source’s Native American/African mixture narrative.', tags:['book','native-american','source-citation'], sourcePages:[117,118] },

  { id:'SYM-SACRED-SEAL', type:'SYMBOL', name:'Ancient Sacred Seal of the Moors', summary:'Inverted crescent and six-pointed star identified by the source as an ancient Moorish/Malian mystical emblem.', tags:['sacred-seal','crescent','six-pointed-star'], sourcePages:[120,126,133] },
  { id:'SYM-INVERTED-CRESCENT', type:'SYMBOL', name:'Inverted Crescent', summary:'Recurring source symbol connected to Moors, Osage, Navajo, Peyote traditions and fraternal symbolism.', tags:['crescent','symbolism'], sourcePages:[118,120,121,126,133] },
  { id:'SYM-SIX-POINTED-STAR', type:'SYMBOL', name:'Six-Pointed Star', summary:'Recurring emblem compared across Moorish, Sumerian, Egyptian, Masonic and Indigenous contexts by the source.', tags:['six-pointed-star','symbolism'], sourcePages:[126,132,133,141] },
  { id:'SYM-FIVE-P', type:'CONCEPT', name:'Five P Framework', summary:'Politics, Psychology, Philosophy, Polytheism and Penal System as a source-derived symbolic governance framework.', tags:['five-p','politics','psychology','philosophy','polytheism','penal-system'], sourcePages:[127] },
  { id:'SYM-ANKH', type:'SYMBOL', name:'Ankh', summary:'Compared by the source across Egyptian and Mesoamerican material.', tags:['ankh','egypt','mesoamerica'], sourcePages:[52] },
  { id:'SYM-SQUASH-BLOSSOM', type:'SYMBOL', name:'Squash Blossom Necklace', summary:'Source compares the necklace with crescent/hand symbolism and links it to Pueblo, Hopi and Zuni usage.', tags:['squash-blossom','native-american','crescent'], sourcePages:[118,119] },
  { id:'SYM-CRESCENT-FLAGS', type:'SYMBOL', name:'Crescent Flag Motif', summary:'Source catalogs multiple national flags and crescents to compare orientation, continuity and political symbolism.', tags:['crescent','flags','comparative-symbolism'], sourcePages:[141,142,143,144,145,146,147] },
  { id:'SYM-RA', type:'SYMBOL', name:'Ra / Ram Symbol Complex', summary:'Source compares Egyptian Ra imagery with later mystery/fraternal symbols.', tags:['ra','ram','symbolism','egypt'], sourcePages:[139,140,141] },
  { id:'SYM-CADUCEUS', type:'SYMBOL', name:'Caduceus', summary:'Source associates the medical caduceus with Hermes/Thoth and later fraternal symbolism.', tags:['caduceus','hermes','thoth','medicine'], sourcePages:[147,148] },

  { id:'INS-AEONMS', type:'INSTITUTION', name:'A.E.O. & A.N.O.M.S.', aliases:['Ancient Egyptian Order & The Arab Nobles of the Mystic Shrine'], summary:'Fraternal institution referenced throughout the source’s Moorish, Egyptian and Masonic comparisons.', tags:['fraternal','shrine','moors'], sourcePages:[2,7,8,16,120,126,138] },
  { id:'INS-FREEMASONS', type:'INSTITUTION', name:'Freemasonry', summary:'Institutional comparison layer used by the source in symbol, constitutional and Egyptian narratives.', tags:['freemasonry','symbols','constitution'], sourcePages:[3,7,8,126,127,132,137,138] },
  { id:'INS-IROQUOIS-CONFED', type:'INSTITUTION', name:'Iroquois Confederacy', summary:'Governance institution presented by the source as a Six Nations league with a matrilineal political framework.', tags:['iroquois','confederacy','governance'], sourcePages:[128,129,130] },

  { id:'EVT-MOORISH-IBERIA', type:'EVENT', name:'Moorish Entry and Rule in Iberia', summary:'Source chronology describes incursions in 710–711, conquest milestones in 711–719, and a long Moorish period in Spain.', tags:['moors','iberia','chronology'], sourcePages:[122,123,124,125] },
  { id:'EVT-CONSTITUTION-GENEALOGY', type:'EVENT', name:'Iroquois–U.S. Constitutional Genealogy Claim', summary:'Source argues that the Great Law of Peace predates and substantially patterns the later U.S. constitutional system.', tags:['constitution','iroquois','genealogy'], sourcePages:[128,130,131] },
  { id:'EVT-SYMBOL-TRANSMISSION', type:'EVENT', name:'Sacred Seal Symbol Transmission Claim', summary:'Source presents a chain of crescent/star symbolism across Moorish, Indigenous, Egyptian, Masonic and modern national contexts.', tags:['symbolism','transmission','sacred-seal'], sourcePages:[118,120,121,126,132,133,141,142,143,144,145,146,147,148] }
]

export const sacredRecordsGraphEdges: SacredGraphEdge[] = [
  { id:'E-001', from:'SRC-RECORD', to:'MTH-FACTOLOGY', relation:'SOURCE_IDENTIFIES_AS', status:'SOURCE_METHOD', summary:'The introduction defines a record-producing research method for testing claims.', sourcePages:[15,16], tags:['factology','method'] },
  { id:'E-002', from:'SRC-RECORD', to:'DOC-DECLARATION', relation:'SOURCE_CITES', status:'SOURCE_STATEMENT', summary:'The introduction quotes the Declaration of Independence as a governance/rights frame.', sourcePages:[14], tags:['rights','governance'] },
  { id:'E-003', from:'PER-YORK', to:'PEO-MOORS', relation:'SOURCE_IDENTIFIES_AS', status:'SOURCE_GENEALOGY_CLAIM', summary:'The source places York within Moorish/Malian and Native-American genealogical narratives.', sourcePages:[16,22,23,24,25], tags:['identity','genealogy'] },
  { id:'E-004', from:'PER-BEN-YORK', to:'PER-YUSUF-BEN-ALI', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'The source presents Ben York within a family line descending from Yusuf Ben Ali/Old York.', sourcePages:[27,29], tags:['york-family','genealogy'] },
  { id:'E-005', from:'PER-YUSUF-BEN-ALI', to:'PEO-MOORS', relation:'SOURCE_IDENTIFIES_AS', status:'SOURCE_GENEALOGY_CLAIM', summary:'The source identifies Yusuf Ben Ali/Old York within a Moorish/Malian line.', sourcePages:[27,29], tags:['moors','genealogy'] },
  { id:'E-006', from:'PER-MANSA-MUSA', to:'PLC-MALI', relation:'SOURCE_LOCATES_IN', status:'SOURCE_HISTORICAL_CLAIM', summary:'Mansa Musa is placed in Mali.', sourcePages:[30,31], tags:['mali'] },
  { id:'E-007', from:'PER-ABU-BAKARI', to:'PLC-AMERICA', relation:'SOURCE_ASSERTS_MIGRATION', status:'SOURCE_MIGRATION_CLAIM', summary:'The source associates Abu Bakari with transatlantic travel toward America.', sourcePages:[30,31], tags:['atlantic','migration'] },
  { id:'E-008', from:'PEO-IDRISIDS', to:'PLC-MOROCCO', relation:'SOURCE_LOCATES_IN', status:'SOURCE_HISTORICAL_CLAIM', summary:'The source locates the Idrisid dynasty in Morocco/Mauritania.', sourcePages:[29,30], tags:['morocco','dynasty'] },
  { id:'E-009', from:'PER-BILAL', to:'PEO-IDRISIDS', relation:'SOURCE_ASSERTS_ANCESTRY', status:'SOURCE_GENEALOGY_CLAIM', summary:'The source links Bilal into the Idrisid/Maghrebi lineage narrative.', sourcePages:[30], tags:['idrisid','genealogy'] },

  { id:'E-010', from:'PEO-NUWBUNS', to:'PLC-AFRICA', relation:'SOURCE_ASSERTS_ORIGIN', status:'SOURCE_MIGRATION_CLAIM', summary:'The source describes Nuwbuns/Nuwaubians as originating in African regions before migrations.', sourcePages:[31,32], tags:['origin','africa'] },
  { id:'E-011', from:'PEO-NUWBUNS', to:'PLC-AMERICA', relation:'SOURCE_ASSERTS_MIGRATION', status:'SOURCE_MIGRATION_CLAIM', summary:'The source presents migrations of Nuwbuns toward the Americas.', sourcePages:[31,32,72,73], tags:['migration','america'] },
  { id:'E-012', from:'PEO-OLMECS', to:'PEO-NUWBUNS', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_HISTORICAL_CLAIM', summary:'The source identifies the Olmec tradition as connected to or descended from Nuwbun/Nuwaubian peoples.', sourcePages:[32,33,46,47], tags:['olmec','nuwbun','genealogy'] },
  { id:'E-013', from:'PEO-OLMECS', to:'PLC-AMERICA', relation:'SOURCE_LOCATES_IN', status:'SOURCE_HISTORICAL_CLAIM', summary:'Olmec evidence and settlements are discussed in Mesoamerica.', sourcePages:[33,46,47,49,50,51], tags:['olmec','america'] },
  { id:'E-014', from:'PEO-OLMECS', to:'PLC-AFRICA', relation:'SOURCE_ASSERTS_ORIGIN', status:'SOURCE_MIGRATION_CLAIM', summary:'The source argues for African origins/continuities in the Olmec narrative.', sourcePages:[41,46,47,51,64], tags:['africa','olmec'] },
  { id:'E-015', from:'PEO-DOGON', to:'PLC-MALI', relation:'SOURCE_LOCATES_IN', status:'SOURCE_HISTORICAL_CLAIM', summary:'Dogon are placed in Mali.', sourcePages:[73,74], tags:['dogon','mali'] },
  { id:'E-016', from:'PEO-HOPI', to:'PEO-DOGON', relation:'SOURCE_ASSOCIATES_WITH', status:'SOURCE_HISTORICAL_CLAIM', summary:'The source compares Hopi customs and ceremonial practices with Dogon traditions.', sourcePages:[74,76,116], tags:['hopi','dogon','ceremony'] },
  { id:'E-017', from:'PEO-MAYA', to:'PEO-OLMECS', relation:'SOURCE_ASSERTS_SUCCESSION', status:'SOURCE_HISTORICAL_CLAIM', summary:'The source presents Maya civilization as inheriting from Olmec traditions.', sourcePages:[75,76,77], tags:['maya','olmec','succession'] },
  { id:'E-018', from:'PEO-MAYA', to:'PLC-CAMBODIA', relation:'SOURCE_ASSERTS_MIGRATION', status:'SOURCE_MIGRATION_CLAIM', summary:'The source describes a migration/comparative link between Maya groups and Cambodia/Angkor.', sourcePages:[76,77,78,79,80], tags:['maya','angkor','migration'] },

  { id:'E-019', from:'PER-GENGHIS', to:'PEO-MONGOLS', relation:'SOURCE_IDENTIFIES_AS', status:'SOURCE_HISTORICAL_CLAIM', summary:'Genghis Khan is identified as a Mongol ruler who united tribes.', sourcePages:[81,82], tags:['genghis','mongols'] },
  { id:'E-020', from:'PER-ESAU', to:'PEO-MONGOLS', relation:'SOURCE_ASSOCIATES_WITH', status:'SOURCE_GENEALOGY_CLAIM', summary:'The source embeds Esau/Edom in a racialized genealogy involving Mongol-related categories.', sourcePages:[82,83,85,88,89,93], tags:['esau','mongol','source-claim'] },
  { id:'E-021', from:'PER-CANAAN', to:'PER-ESAU', relation:'SOURCE_ASSOCIATES_WITH', status:'SOURCE_GENEALOGY_CLAIM', summary:'The source connects Esau to Canaanite wives/tribes.', sourcePages:[85,86,87,88], tags:['esau','canaan'] },
  { id:'E-022', from:'PER-CANAAN', to:'PEO-CANAANITES', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'The source maps Canaan’s children to Canaanite tribal groups.', sourcePages:[96,97,98,99,100,101,102,103,104,105,106,107,108], tags:['canaan','tribes'] },
  { id:'E-023', from:'PER-SIDON', to:'PEO-PHOENICIANS', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'Sidon is connected to Phoenicians/Sidonites.', sourcePages:[96,99], tags:['sidon','phoenicians'] },
  { id:'E-024', from:'PEO-PHOENICIANS', to:'PLC-SPAIN', relation:'SOURCE_ASSERTS_MIGRATION', status:'SOURCE_MIGRATION_CLAIM', summary:'The source describes Phoenician colonies/trade extending into Spain.', sourcePages:[96], tags:['phoenicians','spain','trade'] },
  { id:'E-025', from:'PER-HETH', to:'PEO-HITTITES', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'Heth is connected to Hittites.', sourcePages:[100,101], tags:['heth','hittites'] },
  { id:'E-026', from:'PER-JEBUS', to:'PEO-CANAANITES', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'Jebus is presented as a Canaanite descendant group origin.', sourcePages:[101], tags:['jebus','canaanites'] },
  { id:'E-027', from:'PER-AMOR', to:'PEO-CANAANITES', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'Amor is presented as a Canaanite descendant group origin.', sourcePages:[102,103], tags:['amorites','canaanites'] },
  { id:'E-028', from:'PER-GIRGASH', to:'PEO-CANAANITES', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'Girgash is presented as a Canaanite descendant group origin.', sourcePages:[104], tags:['girgash','canaanites'] },
  { id:'E-029', from:'PER-HIVIY', to:'PEO-CANAANITES', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'Hiviy is presented as a Canaanite descendant group origin.', sourcePages:[104,105], tags:['hivite','canaanites'] },
  { id:'E-030', from:'PER-ARKI', to:'PEO-CANAANITES', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'Arki is presented as a Canaanite descendant group origin.', sourcePages:[105], tags:['arkite','canaanites'] },
  { id:'E-031', from:'PER-SINI', to:'PEO-CANAANITES', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'Sini is presented as a Canaanite descendant group origin.', sourcePages:[106], tags:['sinite','canaanites'] },
  { id:'E-032', from:'PER-ARVAD', to:'PEO-CANAANITES', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'Arvad is presented as a Canaanite descendant group origin.', sourcePages:[106,107], tags:['arvadite','canaanites'] },
  { id:'E-033', from:'PER-ZEMAR', to:'PEO-CANAANITES', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'Zemar is presented as a Canaanite descendant group origin.', sourcePages:[107], tags:['zemarite','canaanites'] },
  { id:'E-034', from:'PER-HAMMATH', to:'PEO-CANAANITES', relation:'SOURCE_ASSERTS_DESCENT', status:'SOURCE_GENEALOGY_CLAIM', summary:'Hammath is presented as a Canaanite descendant group origin.', sourcePages:[108], tags:['hamathite','canaanites'] },

  { id:'E-035', from:'PEO-IROQUOIS', to:'PLC-AMERICA', relation:'SOURCE_LOCATES_IN', status:'SOURCE_HISTORICAL_CLAIM', summary:'The Iroquois are located in North America in the source narrative.', sourcePages:[116,128,129,130,131], tags:['iroquois','america'] },
  { id:'E-036', from:'PEO-IROQUOIS', to:'PEO-SIX-NATIONS', relation:'PART_OF', status:'SOURCE_HISTORICAL_CLAIM', summary:'The source identifies the Iroquois political structure as a Six Nations league.', sourcePages:[128,130], tags:['iroquois','six-nations'] },
  { id:'E-037', from:'PEO-SIX-NATIONS', to:'DOC-GREAT-LAW', relation:'SOURCE_ASSOCIATES_WITH', status:'SOURCE_HISTORICAL_CLAIM', summary:'The Six Nations are associated with the Great Law of Peace/oral constitution.', sourcePages:[128,130], tags:['great-law-of-peace'] },
  { id:'E-038', from:'DOC-GREAT-LAW', to:'DOC-US-CONSTITUTION', relation:'SOURCE_ASSERTS_INFLUENCE', status:'SOURCE_HISTORICAL_CLAIM', summary:'The source claims the U.S. Constitution was patterned on/plagiarized from the Iroquois Great Law of Peace.', sourcePages:[128,130,131], tags:['constitutional-genealogy'] },
  { id:'E-039', from:'EVT-CONSTITUTION-GENEALOGY', to:'DOC-GREAT-LAW', relation:'RELATED_TO', status:'SOURCE_HISTORICAL_CLAIM', summary:'The constitutional-genealogy event centers on the Great Law of Peace.', sourcePages:[128,130,131], tags:['constitution'] },
  { id:'E-040', from:'EVT-CONSTITUTION-GENEALOGY', to:'DOC-US-CONSTITUTION', relation:'RELATED_TO', status:'SOURCE_HISTORICAL_CLAIM', summary:'The constitutional-genealogy event centers on the U.S. Constitution.', sourcePages:[128,130,131], tags:['constitution'] },

  { id:'E-041', from:'SYM-SACRED-SEAL', to:'PEO-MOORS', relation:'SOURCE_ASSOCIATES_SYMBOL_WITH', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The source identifies the inverted crescent/six-pointed-star emblem as an ancient Moorish/Malian sacred seal.', sourcePages:[120,126], tags:['sacred-seal','moors'] },
  { id:'E-042', from:'SYM-SACRED-SEAL', to:'SYM-INVERTED-CRESCENT', relation:'PART_OF', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The inverted crescent is part of the source-described Sacred Seal.', sourcePages:[126], tags:['crescent'] },
  { id:'E-043', from:'SYM-SACRED-SEAL', to:'SYM-SIX-POINTED-STAR', relation:'PART_OF', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The six-pointed star is part of the source-described Sacred Seal.', sourcePages:[126], tags:['six-pointed-star'] },
  { id:'E-044', from:'PEO-OSAGE', to:'SYM-INVERTED-CRESCENT', relation:'SOURCE_ASSOCIATES_SYMBOL_WITH', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The source presents an Osage star-and-crescent symbol.', sourcePages:[118,121], tags:['osage','crescent'] },
  { id:'E-045', from:'PEO-NAVAJO', to:'SYM-INVERTED-CRESCENT', relation:'SOURCE_ASSOCIATES_SYMBOL_WITH', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The source presents a Navajo crescent symbol.', sourcePages:[118,121], tags:['navajo','crescent'] },
  { id:'E-046', from:'SYM-SQUASH-BLOSSOM', to:'SYM-INVERTED-CRESCENT', relation:'SOURCE_COMPARES_SYMBOL_WITH', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The source compares Squash Blossom Necklace forms with crescent/hand motifs.', sourcePages:[118,119], tags:['squash-blossom','crescent'] },
  { id:'E-047', from:'SYM-SACRED-SEAL', to:'INS-AEONMS', relation:'SOURCE_ASSERTS_INFLUENCE', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The source claims later adoption/modification of the Sacred Seal within fraternal orders.', sourcePages:[126], tags:['fraternal','symbol-transmission'] },
  { id:'E-048', from:'SYM-SACRED-SEAL', to:'INS-FREEMASONS', relation:'SOURCE_ASSERTS_INFLUENCE', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The source claims later adaptation of the Sacred Seal in Masonic symbolism.', sourcePages:[126,132], tags:['freemasonry','symbol-transmission'] },
  { id:'E-049', from:'SYM-FIVE-P', to:'INS-FREEMASONS', relation:'SOURCE_ASSOCIATES_WITH', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The Five P framework appears in the source’s Masonic/constitutional discussion.', sourcePages:[127], tags:['five-p','freemasonry'] },
  { id:'E-050', from:'SYM-CRESCENT-FLAGS', to:'SYM-INVERTED-CRESCENT', relation:'SOURCE_COMPARES_SYMBOL_WITH', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The source catalogues national crescent orientations as comparative symbolic evidence.', sourcePages:[142,143,144,145,146,147], tags:['flags','crescent'] },
  { id:'E-051', from:'SYM-RA', to:'INS-FREEMASONS', relation:'SOURCE_COMPARES_SYMBOL_WITH', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The source compares Ra/ram imagery to later mystery/fraternal symbolism.', sourcePages:[139,140,141], tags:['ra','freemasonry'] },
  { id:'E-052', from:'SYM-CADUCEUS', to:'SYM-RA', relation:'SOURCE_ASSOCIATES_WITH', status:'SOURCE_SYMBOLIC_CLAIM', summary:'Both are placed within the source’s final comparative mystery-symbol sequence.', sourcePages:[147,148], tags:['symbolism'] },
  { id:'E-053', from:'EVT-SYMBOL-TRANSMISSION', to:'SYM-SACRED-SEAL', relation:'RELATED_TO', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The source’s symbol-transmission narrative is anchored in the Sacred Seal.', sourcePages:[118,120,121,126,132,133,141,142,143,144,145,146,147,148], tags:['symbol-transmission'] },

  { id:'E-054', from:'PER-MUSA-NOSEYR', to:'EVT-MOORISH-IBERIA', relation:'SOURCE_DESCRIBES_EVENT', status:'SOURCE_HISTORICAL_CLAIM', summary:'Musa is a principal actor in the source’s Iberian conquest chronology.', sourcePages:[122,123], tags:['moors','iberia'] },
  { id:'E-055', from:'PER-TARIF', to:'EVT-MOORISH-IBERIA', relation:'SOURCE_DESCRIBES_EVENT', status:'SOURCE_HISTORICAL_CLAIM', summary:'Tarif is an early commander in the source chronology.', sourcePages:[122,123], tags:['moors','iberia'] },
  { id:'E-056', from:'PER-TARIK', to:'EVT-MOORISH-IBERIA', relation:'SOURCE_DESCRIBES_EVENT', status:'SOURCE_HISTORICAL_CLAIM', summary:'Tarik/Tariq is the principal conquest commander in the source chronology.', sourcePages:[123,124], tags:['moors','iberia'] },
  { id:'E-057', from:'EVT-MOORISH-IBERIA', to:'PLC-SPAIN', relation:'SOURCE_LOCATES_IN', status:'SOURCE_HISTORICAL_CLAIM', summary:'The event is located in Iberia/Spain/Andalusia.', sourcePages:[122,123,124,125], tags:['spain','andalusia'] },
  { id:'E-058', from:'PEO-MOORS', to:'EVT-MOORISH-IBERIA', relation:'SOURCE_DESCRIBES_EVENT', status:'SOURCE_HISTORICAL_CLAIM', summary:'The source attributes a long period of Iberian rule and cultural development to Moors.', sourcePages:[124,125], tags:['moors','spain'] },

  { id:'E-059', from:'PER-KING-FAROUK', to:'INS-FREEMASONS', relation:'SOURCE_ASSOCIATES_WITH', status:'SOURCE_HISTORICAL_CLAIM', summary:'The source shows King Farouk in connection with a Cairo Masonic lodge.', sourcePages:[137], tags:['egypt','freemasonry'] },
  { id:'E-060', from:'PER-NASSER', to:'INS-FREEMASONS', relation:'SOURCE_ASSOCIATES_WITH', status:'SOURCE_HISTORICAL_CLAIM', summary:'The source states Nasser was associated with Freemasons/Shriners.', sourcePages:[138], tags:['egypt','freemasonry'] },
  { id:'E-061', from:'PER-SADAT', to:'INS-FREEMASONS', relation:'SOURCE_ASSOCIATES_WITH', status:'SOURCE_HISTORICAL_CLAIM', summary:'The source states Sadat was associated with Freemasons/Shriners.', sourcePages:[138], tags:['egypt','freemasonry'] },
  { id:'E-062', from:'INS-FREEMASONS', to:'PLC-CAIRO', relation:'SOURCE_LOCATES_IN', status:'SOURCE_HISTORICAL_CLAIM', summary:'The source depicts a Masonic lodge in Cairo and Egyptian institutional symbolism.', sourcePages:[137,138], tags:['cairo','freemasonry'] },

  { id:'E-063', from:'SRC-RECORD', to:'DOC-BOOK-ELDERS', relation:'SOURCE_CITES', status:'SOURCE_HISTORICAL_CLAIM', summary:'The source quotes The Book of Elders within its Native American/African mixture argument.', sourcePages:[117,118], tags:['citation','book-of-elders'] },
  { id:'E-064', from:'SRC-RECORD', to:'SYM-ANKH', relation:'SOURCE_USES_AS_EVIDENCE', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The source uses visual comparison of ankh-like forms as comparative evidence.', sourcePages:[52], tags:['ankh','visual-comparison'] },
  { id:'E-065', from:'SRC-RECORD', to:'SYM-CRESCENT-FLAGS', relation:'SOURCE_USES_AS_EVIDENCE', status:'SOURCE_SYMBOLIC_CLAIM', summary:'The source uses a catalog of national flags to argue symbolic continuity.', sourcePages:[142,143,144,145,146,147], tags:['flags','comparative-symbolism'] }
]

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ')

export function sacredGraphNodeById(id: string): SacredGraphNode | undefined {
  return sacredRecordsGraphNodes.find((node) => node.id === id)
}

export function sacredGraphNeighbors(nodeId: string): Array<{ edge: SacredGraphEdge; node: SacredGraphNode }> {
  const out: Array<{ edge: SacredGraphEdge; node: SacredGraphNode }> = []
  for (const edge of sacredRecordsGraphEdges) {
    const neighborId = edge.from === nodeId ? edge.to : edge.to === nodeId ? edge.from : undefined
    if (!neighborId) continue
    const node = sacredGraphNodeById(neighborId)
    if (node) out.push({ edge, node })
  }
  return out
}

export function searchSacredRecordsGraph(query: string, limit = 20): SacredGraphNode[] {
  const terms = [...new Set(normalize(query).split(/\s+/).filter(Boolean))]
  return sacredRecordsGraphNodes
    .map((node) => {
      const haystack = normalize(`${node.name} ${(node.aliases ?? []).join(' ')} ${node.summary} ${node.tags.join(' ')}`)
      const score = terms.reduce((n, term) => n + (haystack.includes(term) ? 1 : 0), 0)
      return { node, score }
    })
    .filter(({ score }) => terms.length === 0 || score > 0)
    .sort((a, b) => b.score - a.score || a.node.name.localeCompare(b.node.name))
    .slice(0, Math.max(1, limit))
    .map(({ node }) => node)
}

export type SacredGraphPath = {
  nodes: SacredGraphNode[]
  edges: SacredGraphEdge[]
}

/** Breadth-first path finder for source-claimed lineages and transmission chains. */
export function findSacredGraphPath(fromId: string, toId: string, maxDepth = 6): SacredGraphPath | undefined {
  if (fromId === toId) {
    const node = sacredGraphNodeById(fromId)
    return node ? { nodes: [node], edges: [] } : undefined
  }

  type State = { id: string; nodeIds: string[]; edgeIds: string[] }
  const queue: State[] = [{ id: fromId, nodeIds: [fromId], edgeIds: [] }]
  const seen = new Set<string>([fromId])

  while (queue.length) {
    const state = queue.shift()!
    if (state.edgeIds.length >= maxDepth) continue
    for (const { edge, node } of sacredGraphNeighbors(state.id)) {
      if (seen.has(node.id)) continue
      const next = { id: node.id, nodeIds: [...state.nodeIds, node.id], edgeIds: [...state.edgeIds, edge.id] }
      if (node.id === toId) {
        return {
          nodes: next.nodeIds.map((id) => sacredGraphNodeById(id)).filter((n): n is SacredGraphNode => Boolean(n)),
          edges: next.edgeIds.map((id) => sacredRecordsGraphEdges.find((e) => e.id === id)).filter((e): e is SacredGraphEdge => Boolean(e))
        }
      }
      seen.add(node.id)
      queue.push(next)
    }
  }
  return undefined
}

export const sacredRecordsGraphCoverage = {
  source: "Let's Set The Record Straight!",
  totalPdfPages: 150,
  substantivePagesReviewed: '14–150',
  graphVersion: '1.0.0',
  nodeCount: sacredRecordsGraphNodes.length,
  edgeCount: sacredRecordsGraphEdges.length,
  note: 'Front matter/table-of-contents pages are not treated as substantive evidence nodes unless referenced by a later source record.'
} as const
