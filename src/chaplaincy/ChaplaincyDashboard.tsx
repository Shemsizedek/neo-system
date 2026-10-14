import {FileText, ShieldCheck} from 'lucide-react'

export function ChaplaincyDashboard({onOpen}:{onOpen:(workspace:string)=>void}) {
 const areas=[
  ['Temple Instructions','Approved instructions and revisions need a source record, effective date and approving authority.'],
  ['Office Duties','Record duties separately from officeholder identities. Validate the Secretary/Treasurer separation against the governing instructions.'],
  ['Team Structure','Confirm offices, reporting lines and delegated responsibilities from current authorized records.'],
  ['Governance Decisions','Distinguish proposed actions, recorded approvals and completed implementation with evidence.']
 ]
 return <>
  <section className="card focus"><ShieldCheck size={26}/><h2>Chaplaincy Administration</h2><p>Review institutional instructions, responsibilities and decisions alongside the existing NEO workspaces.</p><p>Administrative records have not been loaded into this dashboard. Connected service access and current approvals must be verified before operational use.</p></section>
  <section className="modulegrid">{areas.map(([title,description])=><article className="card module" key={title}><div className="modulehead"><FileText size={20}/><span className="status foundation">AWAITING RECORDS</span></div><h2>{title}</h2><p>{description}</p></article>)}</section>
  <section className="card panel"><div className="paneltitle"><span>Connected NEO Workspaces</span></div><div className="principles"><button className="primary" onClick={()=>onOpen('tribunal')}>Tribunal &amp; E-File</button><button className="primary" onClick={()=>onOpen('treasury')}>Treasury</button><button className="primary" onClick={()=>onOpen('router')}>Routing</button></div><p>These open existing workspaces. Their own authentication, permissions and service readiness apply.</p><p><a href="https://holytemples.org/world-chaplain/" target="_blank" rel="noopener noreferrer">Public World Chaplain page</a> · <a href="https://linear.app/neo-services/issue/NEO-98/add-orange-esop-production-chaplaincy-app-and-api-layer" target="_blank" rel="noopener noreferrer">Orange ESOP implementation record</a></p></section>
  <section className="card focus"><h2>Friday Administration Review</h2><p>NEO Sync Crawl is configured to review Temple Instructions, office duties, team structure and governance decisions on Fridays. Its reports are not yet synchronized into this dashboard.</p><p>Review the public Interfaith Court office listings for titles without officeholder names. Report verified progress, plans, blockers and the next approval-ready action separately.</p><h3>Next Gate</h3><p>Review and merge this navigation integration, then verify the deployed dashboard and authenticated Tribunal/E-File access. Record synchronization requires an authorized source and server-side access controls.</p></section>
 </>
}
