import {useEffect,useMemo,useState} from 'react'
import {Activity, AlertTriangle, Database, Network, Radar, Shield, ShieldCheck} from 'lucide-react'
import {gasBoundary,gasDivisions,gasPrinciples,gasThreatCategories,readinessSummary} from '../globalArmsSystem'

type BackendAlert={id:string;severity:'GREEN'|'AMBER'|'RED';domain:string;title:string;summary:string}
type BackendStatus={system:string;version:string;updatedAt:string;posture:string;overallReadiness:number;commandState:string;sourceModel:string;alerts:BackendAlert[];intelligenceRequirements:string[];guardrails:string[]}

const backendUrl='https://raw.githubusercontent.com/Shemsizedek/neo-system/main/data/neo-gas/status.json'

const fallback:BackendStatus={
 system:'NEO-GAS',version:'2.0.0',updatedAt:'Repository fallback',posture:'DEFENSIVE-INTELLIGENCE',overallReadiness:82,commandState:'ACTIVE',
 sourceModel:'GitHub repository is the versioned backend source of truth; GitHub Pages is the frontend delivery surface.',
 alerts:[],
 intelligenceRequirements:['Strategic warning and crisis indicators','Cyber threat intelligence and defensive incident readiness','Critical infrastructure continuity','Maritime and aerospace domain awareness','Humanitarian logistics and civilian protection','Economic and supply-chain resilience','Source provenance, confidence scoring and competing-hypothesis analysis'],
 guardrails:['No autonomous targeting','No attack execution','No weapons construction guidance','No unlawful weapons acquisition','No unauthorized surveillance','No independent governmental police or military authority']
}

function Stat({label,value,sub,Icon}:{label:string;value:string;sub:string;Icon:typeof Activity}){return <div className="card stat"><div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div><Icon size={22}/></div>}

export function NeoGasDashboard(){
 const[backend,setBackend]=useState<BackendStatus>(fallback)
 const[backendState,setBackendState]=useState<'SYNCING'|'GITHUB'|'FALLBACK'>('SYNCING')
 const ready=useMemo(()=>readinessSummary(),[])
 useEffect(()=>{let live=true;fetch(backendUrl,{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(String(r.status));return r.json()}).then((data:BackendStatus)=>{if(live){setBackend(data);setBackendState('GITHUB')}}).catch(()=>{if(live)setBackendState('FALLBACK')});return()=>{live=false}},[])
 return <>
  <section className="principles">{gasPrinciples.map(p=><span key={p}>{p}</span>)}</section>
  <section className="stats">
   <Stat label="Overall Readiness" value={`${backend.overallReadiness}%`} sub={`${backend.commandState} • ${backend.posture}`} Icon={Radar}/>
   <Stat label="Directorates" value={`${gasDivisions.length}`} sub={`${ready.GREEN} green • ${ready.AMBER} amber`} Icon={Network}/>
   <Stat label="Threat Domains" value={`${gasThreatCategories.length}`} sub="Defensive monitoring model" Icon={Activity}/>
   <Stat label="Backend" value={backendState} sub="GitHub source-of-truth" Icon={Database}/>
  </section>
  <section className="focusgrid">
   <div className="card focus"><Shield size={26}/><h2>NEO-GAS Operating Boundary</h2><p>{gasBoundary}</p><p><b>Backend:</b> {backend.sourceModel}</p><p><b>Version:</b> {backend.version}</p></div>
   <div className="card focus"><ShieldCheck size={26}/><h2>Intelligence Production Standard</h2><p>Every assessment should separate known facts, source confidence, analytic judgment, alternative hypotheses, uncertainty, and recommended defensive action.</p><p><b>Updated:</b> {backend.updatedAt}</p></div>
  </section>
  {backend.alerts.length>0&&<section className="card tablecard"><div className="paneltitle"><div><span>Command Alerts</span><small>Versioned in the GitHub backend</small></div><AlertTriangle size={18}/></div><div className="tablewrap"><table><thead><tr><th>ID</th><th>Level</th><th>Domain</th><th>Alert</th><th>Assessment</th></tr></thead><tbody>{backend.alerts.map(a=><tr key={a.id}><td className="mono">{a.id}</td><td>{a.severity}</td><td>{a.domain}</td><td>{a.title}</td><td>{a.summary}</td></tr>)}</tbody></table></div></section>}
  <section className="modulegrid">{gasDivisions.map(d=><article className="card module" key={d.id}><div className="modulehead"><Network size={20}/><span className={'status '+(d.readiness==='GREEN'?'active':'foundation')}>{d.readiness}</span></div><h2>{d.name}</h2><p>{d.mission}</p><div className="boundary"><ShieldCheck size={14}/><span>{d.functions.join(' • ')}</span></div></article>)}</section>
  <section className="focusgrid"><div className="card focus"><Radar size={26}/><h2>Priority Intelligence Requirements</h2><ul>{backend.intelligenceRequirements.map(x=><li key={x}>{x}</li>)}</ul></div><div className="card focus"><ShieldCheck size={26}/><h2>System Guardrails</h2><ul>{backend.guardrails.map(x=><li key={x}>{x}</li>)}</ul></div></section>
  <section className="modulegrid">{gasThreatCategories.map(t=><article className="card module" key={t.id}><div className="modulehead"><AlertTriangle size={20}/><span className="status foundation">MONITOR</span></div><h2>{t.name}</h2><p>{t.scope}</p><div className="boundary"><ShieldCheck size={14}/><span>{t.defensiveResponse}</span></div></article>)}</section>
 </>
}
