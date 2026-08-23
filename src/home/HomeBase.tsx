import {
  ArrowRight, BookOpen, BrainCircuit, Building2, CircleDollarSign,
  Compass, GraduationCap, Landmark, Network, ShieldCheck, Sparkles
} from 'lucide-react'
import {foundationalPrinciples,neoModules} from '../neoSystem'

type HomeBaseProps={onOpen:(section:string)=>void}

const pillars=[
  {title:'Knowledge & Noology',body:'Research, NEO Lingo, NEO Lexicon, Noology, source provenance and disciplined reasoning for long-term knowledge continuity.',Icon:BrainCircuit},
  {title:'Economic Resilience',body:'Treasury, NEO CFO, NEO Books, Bitcoin/Counterparty infrastructure and mutual-credit systems designed for accountable economic coordination.',Icon:CircleDollarSign},
  {title:'Education & Capacity',body:'GISD, learning systems, curricula, records and tools that help communities build durable intellectual and technical capacity.',Icon:GraduationCap},
  {title:'Governance & Records',body:'Institutional administration, tribunal workflows, legal corpus, records, policy coordination and human-authorized decision support.',Icon:Landmark},
  {title:'Global Indigenous Futures',body:'A collaboration layer for cultural preservation, education, economic resilience, research exchange and community-led development across borders.',Icon:Compass},
  {title:'Security & Continuity',body:'Defensive cyber resilience, continuity planning, evidence integrity, access controls and protected knowledge operations.',Icon:ShieldCheck}
]

const routes=[
  {label:'Command Center',section:'overview',desc:'System-wide status, mission and module registry',Icon:Network},
  {label:'NEO CFO',section:'cfo',desc:'Finance, cash flow, credit and investment coordination',Icon:CircleDollarSign},
  {label:'NEO Treasury',section:'treasury',desc:'Treasury, trust and revenue administration',Icon:Landmark},
  {label:'Legal Corpus',section:'corpus',desc:'Authorities, instruments, records and provenance',Icon:BookOpen}
]

export function HomeBase({onOpen}:HomeBaseProps){
  const active=neoModules.filter(m=>m.status==='ACTIVE').length
  const foundation=neoModules.filter(m=>m.status==='FOUNDATION').length

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
        <div className="signal"><i/> SYSTEM FOUNDATION ONLINE</div>
        <div className="home-metrics">
          <div><strong>{neoModules.length}</strong><span>Registered modules</span></div>
          <div><strong>{active}</strong><span>Active modules</span></div>
          <div><strong>{foundation}</strong><span>Foundation modules</span></div>
        </div>
        <div className="mission-note">
          <ShieldCheck size={20}/>
          <div><b>Mission safeguard</b><p>Protect continuity of purpose, source integrity, human accountability and community benefit as the ecosystem expands.</p></div>
        </div>
      </div>
    </section>

    <section className="home-section">
      <div className="section-kicker">WHY THIS EXISTS</div>
      <h3>Build infrastructure that communities can understand, govern and carry forward.</h3>
      <p className="section-copy">The interface is intentionally organized around enduring capabilities rather than short-lived apps. Individual tools can change; the institutional memory, principles, data boundaries and mission should remain legible and stable.</p>
    </section>

    <section className="pillar-grid">
      {pillars.map(({title,body,Icon})=><article className="card pillar" key={title}><Icon size={22}/><h3>{title}</h3><p>{body}</p></article>)}
    </section>

    <section className="home-section" id="system-map">
      <div className="section-kicker">SYSTEM MAP</div>
      <h3>One ecosystem. Multiple operational domains.</h3>
      <p className="section-copy">Use the home base to move into deeper working environments only when needed.</p>
      <div className="route-grid">
        {routes.map(({label,section,desc,Icon})=><button className="card route-card" key={section} onClick={()=>onOpen(section)}><Icon size={20}/><div><b>{label}</b><span>{desc}</span></div><ArrowRight size={17}/></button>)}
      </div>
    </section>

    <section className="home-section future-band">
      <Building2 size={24}/>
      <div><div className="section-kicker">LONG HORIZON</div><h3>Designed to outlive any single app, platform or deployment provider.</h3><p>The NEO System remains the source foundation. Interfaces, hosting and modules can evolve around it without losing provenance, governance boundaries or institutional continuity.</p></div>
    </section>
  </div>
}
