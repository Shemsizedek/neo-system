import { Activity, CheckCircle2, GitBranch, Network, ShieldCheck, TriangleAlert } from 'lucide-react'

const connectors = [
  ['GitHub','Native','PRIMARY'],['GitHub','Airbyte','DEGRADED'],['GitLab','Airbyte','BOUND'],
  ['Asana','Native / Airbyte','ACTIVE'],['Gmail','Airbyte','BOUND'],['Search Console','Airbyte','BOUND'],['TikTok Marketing','Airbyte','BOUND'],
]

export function RouterControlCenter(){
  return <>
    <section className="principles"><span>ORIGIN / NIA-001</span><span>LEAST PRIVILEGE</span><span>PROVENANCE</span><span>HUMAN APPROVAL</span></section>
    <section className="stats">
      <div className="card stat"><div><span>Router State</span><strong>ACTIVE</strong><small>Governed orchestration</small></div><Network size={22}/></div>
      <div className="card stat"><div><span>Connector Routes</span><strong>{connectors.length}</strong><small>Native + Airbyte fabric</small></div><GitBranch size={22}/></div>
      <div className="card stat"><div><span>Approval Boundary</span><strong>ENFORCED</strong><small>High-impact writes gated</small></div><ShieldCheck size={22}/></div>
      <div className="card stat"><div><span>Mission 001</span><strong>DISPATCHED</strong><small>GitHub → Asana</small></div><Activity size={22}/></div>
    </section>
    <section className="card tablecard"><div className="paneltitle"><div><span>Connector Fabric</span><small>Operational routing and adapter health</small></div><Network size={18}/></div><div className="tablewrap"><table><thead><tr><th>Platform</th><th>Transport</th><th>Status</th><th>Control</th></tr></thead><tbody>{connectors.map(([platform,transport,status])=><tr key={platform+transport}><td>{platform}</td><td>{transport}</td><td><span className={'pill '+(status==='DEGRADED'?'manual_review':'authorized')}>{status}</span></td><td>{status==='DEGRADED'?<><TriangleAlert size={14}/> schema discovery retry</>:<><CheckCircle2 size={14}/> governed</>}</td></tr>)}</tbody></table></div></section>
    <section className="focusgrid"><div className="card focus"><Activity size={26}/><h2>Active Mission</h2><p><b>NEO-ROUTER-MISSION-001</b></p><p>Triage and safely rebase stale neo-system pull requests, rerun CI, preserve provenance, and stop at approval gates before consequential merges.</p></div><div className="card focus"><ShieldCheck size={26}/><h2>Runtime Boundary</h2><p>Connector instance IDs and credentials remain runtime-only. Source control contains variable names and policy contracts, never live secrets or connector IDs.</p></div></section>
  </>
}
