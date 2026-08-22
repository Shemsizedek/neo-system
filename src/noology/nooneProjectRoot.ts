export type NooneProjectDomain =
  | 'KNOWLEDGE'
  | 'INTELLIGENCE'
  | 'TIME_NATURE'
  | 'ECONOMY'
  | 'LAW_STEWARDSHIP'
  | 'SOCIETY'
  | 'GOVERNANCE'
  | 'INFRASTRUCTURE'

export type NooneProjectNode = {
  id: string
  title: string
  domain: NooneProjectDomain
  role: string
  sourcePages: number[]
  tags: string[]
  children?: string[]
}

export type NooneProjectRoot = {
  id: 'NOONE_PROJECT'
  canonicalName: 'The Noone Project'
  classification: 'FOUNDATIONAL_MASTER_BLUEPRINT'
  systemRole: 'PROJECT_OF_PROJECTS'
  architecturalPriority: 'ROOT'
  sourceDate: '2016-06-27'
  sourceTitle: string
  missionSummary: string
  operatingDomains: string[]
  nodes: NooneProjectNode[]
  provenanceChain: string[]
}

export const nooneProject: NooneProjectRoot = {
  id: 'NOONE_PROJECT',
  canonicalName: 'The Noone Project',
  classification: 'FOUNDATIONAL_MASTER_BLUEPRINT',
  systemRole: 'PROJECT_OF_PROJECTS',
  architecturalPriority: 'ROOT',
  sourceDate: '2016-06-27',
  sourceTitle: 'Noone Society Presents the Noone Project',
  missionSummary:
    'Umbrella social-development blueprint coordinating education, housing, finance, social exchange, environmental systems, law, politics, technology, infrastructure, culture, and governance through a nature-centered Noone framework.',
  operatingDomains: ['Philosophy','Politics','Law','Military','Socio-Economics','Science','Health','Entertainment','Relationships'],
  provenanceChain: [
    'Noone Project',
    'Community Exchange / CES',
    'NOMNI and Noone financial services',
    'Global Credit Facility',
    'World Credit Clock'
  ],
  nodes: [
    { id:'NOONE_KNOWLEDGE', title:'Knowledge', domain:'KNOWLEDGE', role:'Knowledge, provenance, doctrine, education, and research layer', sourcePages:[3,5,13,14,16,58,60], tags:['noone-science','noology','factology','noogle','education'], children:['NOONE_UNIVERSITY','NOOGLE','NEO_MAXIMS','SACRED_RECORDS'] },
    { id:'NOONE_INTELLIGENCE', title:'Intelligence', domain:'INTELLIGENCE', role:'Noological reasoning, synthesis, pattern analysis, and developmental intelligence', sourcePages:[3,8,9,16,60,96], tags:['neo-algo','noogenesis','neoteric-method','sound-right-reason'], children:['NEO_ALGO','NOOGONY','NOOGENESIS'] },
    { id:'NOONE_TIME_NATURE', title:'Time & Nature', domain:'TIME_NATURE', role:'Natural cycles, sacred time, contribution time, and restorative timing', sourcePages:[4,16,60], tags:['world-credit-clock','clock-of-destiny','nilotic-time','nature-cycles'], children:['WORLD_CREDIT_CLOCK','NUWAUBIAN_CALENDAR','NATURE_CYCLES'] },
    { id:'NOONE_ECONOMY', title:'Economy', domain:'ECONOMY', role:'Mutual credit, community exchange, finance, development, and circulation of value', sourcePages:[5,7,27,28,29,30,31,32,33,34,36,57], tags:['ces','nomni','mutual-credit','finance','global-credit-facility'], children:['GLOBAL_CREDIT_FACILITY','NOMNI','NU_WEALTH_NETWORK','RESTORATIVE_ACCOUNTING'] },
    { id:'NOONE_LAW', title:'Law & Stewardship', domain:'LAW_STEWARDSHIP', role:'Natural law, provenance, inheritance, title, probate, IP, and restorative remedies', sourcePages:[5,9,14,15,16], tags:['natural-law','inheritance','title','probate','ip','restitution'], children:['GLOBAL_INHERITANCE_GRAPH','ECCLESIASTICAL_TITLE','RESTORATIVE_JURISPRUDENCE'] },
    { id:'NOONE_SOCIETY', title:'Society', domain:'SOCIETY', role:'Human development systems for housing, education, health, food, culture, transport, and communications', sourcePages:[5,6,10,11,12,14,15,16,35,37,43,44], tags:['nu-cities-of-peace','housing','health','food','education','transportation','communications'], children:['NU_CITIES_OF_PEACE','NOONE_UNIVERSITY','ALL_NATURE_UNITED'] },
    { id:'NOONE_GOVERNANCE', title:'Governance', domain:'GOVERNANCE', role:'Central Solution Office and nine-domain council coordination under Noocracy', sourcePages:[8,9,14,15], tags:['central-solution-office','nine-councils','noocracy','governance'], children:['CENTRAL_SOLUTION_OFFICE','NOOCRACY','WORLD_TEMPLE','DIVAN'] },
    { id:'NOONE_INFRASTRUCTURE', title:'Infrastructure & Technology', domain:'INFRASTRUCTURE', role:'Energy, communications, transportation, housing, manufacturing, agriculture, and resilient settlement technologies', sourcePages:[18,19,20,21,22,23,24,26,35,38,39,40,41,43,44,45,46,61], tags:['solar','geothermal','gulf-stream','3d-printing','hydrogen','agriculture','communications','resilience'] },

    { id:'NOONE_UNIVERSITY', title:'Noone University', domain:'KNOWLEDGE', role:'Education', sourcePages:[5,21], tags:['education','university'] },
    { id:'NU_CITIES_OF_PEACE', title:'Nu Cities of Peace', domain:'SOCIETY', role:'Housing and settlement', sourcePages:[5,37], tags:['housing','cities','settlement'] },
    { id:'GLOBAL_CREDIT_FACILITY', title:'Global Credit Facility', domain:'ECONOMY', role:'Later credit architecture linked through CES/NOMNI provenance', sourcePages:[27,28,29,30,31,32,33,34,36], tags:['credit','finance','mutual-credit'] },
    { id:'NOMNI', title:'NOMNI', domain:'ECONOMY', role:'Community-exchange / currency unit lineage', sourcePages:[7,28,29], tags:['nomni','ces','currency'] },
    { id:'NU_WEALTH_NETWORK', title:'Nu Wealth Network', domain:'ECONOMY', role:'Social-economic network', sourcePages:[5,47], tags:['network','economics'] },
    { id:'ALL_NATURE_UNITED', title:'All Nature United', domain:'SOCIETY', role:'Environmental systems', sourcePages:[5], tags:['environment','nature'] },
    { id:'CENTRAL_SOLUTION_OFFICE', title:'Central Solution Office', domain:'GOVERNANCE', role:'Nine-domain problem-solving and council coordination', sourcePages:[3,14,15], tags:['central-solution-office','councils'] },
    { id:'NOOCRACY', title:'Noocracy', domain:'GOVERNANCE', role:'Reason-centered governance model described by the source', sourcePages:[9], tags:['noocracy','governance','reason'] },
    { id:'NOOGLE', title:'Noogle', domain:'KNOWLEDGE', role:'Knowledge / holographic / noosphere information concept', sourcePages:[58,59,60], tags:['noogle','noosphere','knowledge'] },
    { id:'NEO_ALGO', title:'NEO Algo', domain:'INTELLIGENCE', role:'Modern noological reasoning engine implementing project principles', sourcePages:[8,9,16,60,96], tags:['neo-algo','noology'] },
    { id:'WORLD_CREDIT_CLOCK', title:'World Credit Clock', domain:'TIME_NATURE', role:'Quantitative contribution and restorative accounting clock derived from later NEO architecture', sourcePages:[27,28,29,30,31,32,33,34], tags:['world-credit-clock','mutual-credit','time'] },
    { id:'NUWAUBIAN_CALENDAR', title:'Nuwaubian Temple Calendar', domain:'TIME_NATURE', role:'Sacred-cycle timing layer', sourcePages:[4], tags:['calendar','sacred-time'] },
    { id:'NATURE_CYCLES', title:'Nature Cycles', domain:'TIME_NATURE', role:'Natural-cycle context for system decisions', sourcePages:[4,16,60], tags:['nature','cycles'] },
    { id:'GLOBAL_INHERITANCE_GRAPH', title:'Global Indigenous Inheritance & IP Title Graph', domain:'LAW_STEWARDSHIP', role:'Modern provenance/title audit layer', sourcePages:[5,14,15], tags:['inheritance','ip','title'] },
    { id:'ECCLESIASTICAL_TITLE', title:'Ecclesiastical Title Layer', domain:'LAW_STEWARDSHIP', role:'Temple, office, deed-poll, and sacred-source authority graph', sourcePages:[14,15], tags:['ecclesiastical','title'] },
    { id:'RESTORATIVE_JURISPRUDENCE', title:'Restorative Jurisprudence', domain:'LAW_STEWARDSHIP', role:'Restoration and remedy logic', sourcePages:[5,14,15,16], tags:['restoration','law'] },
    { id:'RESTORATIVE_ACCOUNTING', title:'Restorative Accounting', domain:'ECONOMY', role:'Links provenance, contribution, extraction, and World Credit Clock accounting', sourcePages:[27,28,29,30,31,32,33,34], tags:['accounting','restoration'] },
    { id:'WORLD_TEMPLE', title:'World Temple', domain:'GOVERNANCE', role:'Ecclesiastical governance node in the later NEO architecture', sourcePages:[14,15], tags:['temple','governance'] },
    { id:'DIVAN', title:'Royal and Imperial Divan', domain:'GOVERNANCE', role:'Governance / ecclesiastical institutional node in the later NEO architecture', sourcePages:[14,15], tags:['divan','governance'] },
    { id:'NEO_MAXIMS', title:'NEO Maxims', domain:'KNOWLEDGE', role:'First-principles control layer', sourcePages:[8,14,16], tags:['maxims','principles'] },
    { id:'SACRED_RECORDS', title:'Sacred Records', domain:'KNOWLEDGE', role:'Historical, symbolic, and provenance source layer', sourcePages:[13,16], tags:['records','provenance'] },
    { id:'NOOGONY', title:'Noogony', domain:'INTELLIGENCE', role:'Origin and ancestry of ideas and intelligence', sourcePages:[3,8,60], tags:['noogony','origins'] },
    { id:'NOOGENESIS', title:'Noogenesis', domain:'INTELLIGENCE', role:'Development and emergence of intelligence', sourcePages:[3,8,60], tags:['noogenesis','development'] }
  ]
}

export const nooneProjectNodeById = (id: string) => nooneProject.nodes.find((node) => node.id === id)
export const nooneProjectNodesByDomain = (domain: NooneProjectDomain) => nooneProject.nodes.filter((node) => node.domain === domain)

export const NEO_MAXIM_THE_WHOLE_COORDINATES_THE_PARTS = {
  id: 'NMX-NOONE-001',
  title: 'The Whole Coordinates the Parts',
  statement: 'No project is isolated when every project serves the same living system.',
  operationalMeaning: 'Evaluate projects by both local function and their contribution to the integrity, resilience, and mission of the Noone Project as a whole.'
} as const
