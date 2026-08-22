import {Activity, BadgeDollarSign, BookOpenCheck, Bot, CalendarClock, ChartNoAxesCombined, CircleDollarSign, CreditCard, Landmark, LockKeyhole, ShieldCheck, TrendingUp, WalletCards} from 'lucide-react'
import {cfoApprovalGates,cfoAuthority,cfoWorkflow,cfoWorkstreams} from './policy'

const iconMap = {cash:WalletCards,bills:CalendarClock,credit:CreditCard,investing:TrendingUp,trading:ChartNoAxesCombined,reporting:BookOpenCheck}

export function CfoDashboard(){
  return <>
    <section className="principles"><span>Cash Before Risk</span><span>Human Approval</span><span>Estate Segregation</span><span>Prudent Investing</span><span>Audit Everything</span></section>
    <section className="stats">
      <div className="card stat"><div><span>Cash Position</span><strong>UNCONFIGURED</strong><small>Approved balances required</small></div><CircleDollarSign size={22}/></div>
      <div className="card stat"><div><span>Monthly Obligations</span><strong>UNCONFIGURED</strong><small>Bill calendar required</small></div><CalendarClock size={22}/></div>
      <div className="card stat"><div><span>Credit Profile</span><strong>UNCONFIGURED</strong><small>Redacted reports required</small></div><CreditCard size={22}/></div>
      <div className="card stat"><div><span>Execution Mode</span><strong>APPROVAL</strong><small>No autonomous money movement</small></div><LockKeyhole size={22}/></div>
    </section>

    <section className="focusgrid">
      <div className="card focus"><Bot size={26}/><h2>{cfoAuthority.operatingAgent} — {cfoAuthority.designation}</h2><p><b>Principal:</b> {cfoAuthority.principal}</p><p><b>Estate:</b> {cfoAuthority.estate}</p><p>NEOsync coordinates finance, analysis, records and specialist agents. Honorable Larry Shelton retains legal authority, signatures, fiduciary accountability and final transaction approval.</p></div>
      <div className="card focus"><Landmark size={26}/><h2>Finance Command Workflow</h2><p>{cfoWorkflow.join(' → ')}</p><p>Recommendations become transactions only after recorded trustee approval and execution by an authorized institution or signer.</p></div>
    </section>

    <section className="modulegrid">{cfoWorkstreams.map(stream=>{const Icon=iconMap[stream.id];return <article className="card module" key={stream.id}><div className="modulehead"><Icon size={20}/><span className={'status '+(stream.status==='READY'?'active':'foundation')}>{stream.status}</span></div><h2>{stream.name}</h2><p>{stream.objective}</p><div className="boundary"><Activity size={14}/><span>Next: {stream.nextAction}</span></div></article>})}</section>

    <section className="focusgrid">
      <div className="card focus"><ShieldCheck size={26}/><h2>Trustee Approval Gates</h2><ul>{cfoApprovalGates.map(gate=><li key={gate}>{gate}</li>)}</ul></div>
      <div className="card focus"><BadgeDollarSign size={26}/><h2>Wealth-Building Sequence</h2><ol><li>Reconcile income and spending</li><li>Protect essentials and payment history</li><li>Build the operating reserve</li><li>Eliminate destructive interest</li><li>Invest under a written policy</li><li>Use only separately approved risk capital for trading</li></ol></div>
    </section>
  </>
}
