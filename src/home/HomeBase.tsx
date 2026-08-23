import {
  ArrowRight, BookOpen, BrainCircuit, Building2, CircleDollarSign,
  Compass, GraduationCap, Landmark, Network, ShieldCheck, Sparkles,
  LockKeyhole, RadioTower, Globe2, Bot, Activity, Database, Users
} from 'lucide-react'
import {foundationalPrinciples,neoModules} from '../neoSystem'

type HomeBaseProps={onOpen:(section:string)=>void}
type Access='PUBLIC'|'CONTROLLED'|'PRIVATE'

const pillars=[
  {title:'Knowledge & Noology',body:'Research, NEO Lingo, NEO Lexicon, Noology, source provenance and disciplined reasoning for long-term knowledge continuity.',Icon:BrainCircuit},
  {title:'Economic Resilience',body:'Treasury, NEO CFO, NEO Books, Bitcoin/Counterparty infrastructure and mutual-credit systems designed for accountable economic coordination.',Icon:CircleDollarSign},
  {title:'Education & Capacity',body:'GISD, learning systems, curricula, records and tools that help communities build durable intellectual and technical capacity.',Icon:GraduationCap},
  {title:'Governance & Records',body:'Institutional administration, tribunal workflows, legal corpus, records, policy coordination and human-authorized decision support.',Icon:Landmark},
  {title:'Global Indigenous Futures',body:'A collaboration layer for cultural preservation, education, economic resilience, research exchange and community-led development across borders.',Icon:Compass},
  {title:'Security & Continuity',body:'Defensive cyber resilience, continuity planning, evidence integrity, access controls and protected knowledge operations.',Icon:ShieldCheck}
]

const routes:{label:string;section:string;desc:string;access:Access;Icon:typeof Network}[]=[
  {label:'Command Center',section:'overview',desc:'System-wide status, mission and module registry',access:'CONTROLLED',Icon:Network},
  {label:'NEO CFO',section:'cfo',desc:'Finance, cash flow, credit and investment coordination',access:'PRIVATE',Icon:CircleDollarSign},
  {label:'NEO Treasury',section:'treasury',desc:'Treasury, trust and revenue administration',access:'PRIVATE',Icon:Landmark},
  {label:'Legal Corpus',section:'corpus',desc:'Authorities, instruments, records and provenance',access:'CONTROLLED',Icon:BookOpen}
]

const globalLanes=[
  {title:'Knowledge Exchange',body:'Preserve language, history, research, oral traditions, archives and community-controlled knowledge.',Icon:BookOpen},
  {title:'Education Networks',body:'Connect schools, teachers, curricula, apprenticeships and digital learning infrastructure across communities.',Icon:GraduationCap},
  {title:'Economic Cooperation',body:'Develop transparent pathways for trade, mutual credit, enterprise, finance education and resilient local economies.',Icon:CircleDollarSign},
  {title:'Community Infrastructure',body:'Coordinate technology, communications, records, resilience planning and locally governed development projects.',Icon:Globe2}
]

export function HomeBase({onOpen}:HomeBaseProps){
  const active=neoModules.filter(m=>m.status==='ACTIVE').length
  const foundation=neoModules.filter(m=>m.status==='FOUNDATION').length
  const sandbox=neoModules.filter(m=>m.status==='SANDBOX').length

  return <div className="homebase">
    <section className="homehero">
      <div className="homehero-copy">
        <div className="eyebrow"><Sparkles size={15}/> FEODUS OPERUM • NEO ECOSYSTEM</div>
        <h2>A durable digital home base for knowledge, coordination, resilience and a better future.</h2>
        <p className="lead">NEO is being developed as an integrated ecosystem for research, education, economic coordination, institutional records, technology and community resilience. This home base is the stable front door: simple enough to navigate today, modular enough to grow for decades.</p>
        <div className="hero-actions">
          <button className="primary home-primary" onClick={()=>onOpen('overview')}>Enter Command Center <ArrowRight size={16}/></button>
          <a className="secondary-link" href="#system-map">View system map</a>
        </div>
        <div className="principles home-principles">{foundationalPrinciples.map(p=><span key={p}>{p}</span>)}</div>
      </div>
      <div className="homehero-panel card">
        <div className="signal"><i/> FOUNDATION INTERFACE ONLINE</div>
        <div className="home-metrics">
          <div><strong>{neoModules.length}</strong><span>Registered modules</span></div>
          <div><strong>{active}</strong><span>Registry active</span></div>
          <div><strong>{foundation}</strong><span>Foundation stage</span></div>
        </div>
        <div className="mission-note">
          <ShieldCheck size={20}/>
          <div><b>Mission safeguard</b><p>Protect continuity of purpose, source integrity, human accountability and community benefit as the ecosystem expands.</p></div>
        </div>
      </div>
    </section>

    <section className="access-strip" aria-label="NEO access model">
      <div><span className="access public">PUBLIC</span><p>Mission, education, public research and community-facing information.</p></div>
      <div><span className="access controlled">CONTROLLED</span><p>Operational workspaces requiring context, policy boundaries or authorized participation.</p></div>
      <div><span className="access private">PRIVATE</span><p>Finance, protected records, credentials and sensitive institutional administration.</p></div>
    </section>

    <section className="home-section">
      <div className="section-kicker">WHY THIS EXISTS</div>
      <h3>Build infrastructure that communities can understand, govern and carry forward.</h3>
      <p className="section-copy">The interface is intentionally organized around enduring capabilities rather than short-lived apps. Individual tools can change; the institutional memory, principles, data boundaries and mission should remain legible and stable.</p>
    </section>

    <section className="pillar-grid">
      {pillars.map(({title,body,Icon})=><article className="card pillar" key={title}><Icon size={22}/><h3>{title}</h3><p>{body}</p></article>)}
    </section>

    <section className="home-section health-section">
      <div className="section-kicker">SYSTEM HEALTH</div>
      <h3>Know what is registered, what is operational and what still needs work.</h3>
      <p className="section-copy">Registry status is not the same as live-service availability. The home base keeps those concepts separate so future dashboards can report real telemetry without overstating readiness.</p>
      <div className="health-grid">
        <article className="card health-card"><Database size={20}/><strong>{neoModules.length}</strong><span>Modules in source registry</span><small>Canonical architecture inventory</small></article>
        <article className="card health-card"><Activity size={20}/><strong>{active}</strong><span>Marked ACTIVE</span><small>Registry designation, not uptime</small></article>
        <article className="card health-card"><Building2 size={20}/><strong>{foundation}</strong><span>Foundation modules</span><small>Architecture or implementation stage</small></article>
        <article className="card health-card"><RadioTower size={20}/><strong>{sandbox}</strong><span>Sandbox modules</span><small>Experimental or simulation state</small></article>
      </div>
    </section>

    <section className="home-section neo-sync-band">
      <div className="neosync-icon"><Bot size={30}/></div>
      <div className="neosync-copy"><div className="section-kicker">NEOSYNC INTERFACE</div><h3>One conversational gateway into the ecosystem.</h3><p>NEOsync is the planned coordination interface for navigating knowledge, projects, records and system tools. At this stage it is presented as an interface role—not an autonomous authority. Sensitive actions, signatures, institutional decisions and regulated activity remain subject to human authorization and applicable controls.</p></div>
      <button className="secondary-button" onClick={()=>onOpen('overview')}>Open system workspace <ArrowRight size={16}/></button>
    </section>

    <section className="home-section global-section">
      <div className="section-kicker">GLOBAL INDIGENOUS FUTURES</div>
      <h3>Technology should strengthen communities without flattening their identity.</h3>
      <p className="section-copy">The global collaboration layer is designed around community-led participation, cultural continuity, reciprocal exchange and practical capacity building. It is not a claim of authority over Indigenous peoples or nations.</p>
      <div className="global-grid">{globalLanes.map(({title,body,Icon})=><article className="card global-card" key={title}><Icon size={21}/><div><b>{title}</b><p>{body}</p></div></article>)}</div>
    </section>

    <section className="home-section" id="system-map">
      <div className="section-kicker">SYSTEM MAP</div>
      <h3>One ecosystem. Multiple operational domains.</h3>
      <p className="section-copy">Use the home base to move into deeper working environments only when needed. Access labels describe the intended information boundary; authentication and authorization controls will be enforced as those services become live.</p>
      <div className="route-grid">
        {routes.map(({label,section,desc,access,Icon})=><button className="card route-card" key={section} onClick={()=>onOpen(section)}><Icon size={20}/><div><b>{label}</b><span>{desc}</span></div><div className="route-end"><span className={'access '+access.toLowerCase()}>{access}</span><ArrowRight size={17}/></div></button>)}
      </div>
    </section>

    <section className="home-section stewardship-band">
      <LockKeyhole size={24}/>
      <div><div className="section-kicker">STEWARDSHIP MODEL</div><h3>Public by design where possible. Controlled where necessary. Private where required.</h3><p>NEO should preserve provenance, minimize unnecessary exposure of sensitive information, separate advisory software from human authority and keep clear records of who can do what.</p></div>
      <div className="stewardship-points"><span><Users size={15}/> Human accountability</span><span><ShieldCheck size={15}/> Least privilege</span><span><Database size={15}/> Provenance first</span></div>
    </section>

    <section className="home-section future-band">
      <Building2 size={24}/>
      <div><div className="section-kicker">LONG HORIZON</div><h3>Designed to outlive any single app, platform or deployment provider.</h3><p>The NEO System remains the source foundation. Interfaces, hosting and modules can evolve around it without losing provenance, governance boundaries or institutional continuity.</p></div>
    </section>
  </div>
}
