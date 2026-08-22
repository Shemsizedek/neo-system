import {useMemo,useState} from 'react'
import {BookOpen,FileCheck2,FileLock2,Filter,Link2,Search,ShieldCheck} from 'lucide-react'
import {corpusRecords} from './corpusData'
import {corpusStats,getAuthorityGraph,searchCorpus,type AuthorityLayer} from './corpusEngine'

const layerLabels: Record<AuthorityLayer,string> = {
  DIVINE:'Divine',
  ECCLESIASTICAL:'Ecclesiastical',
  NOOCRATIC_CONSTITUTIONAL:'Noocratic Constitutional',
  ADMINISTRATIVE:'Administrative',
  HISTORICAL:'Historical',
  UNITED_STATES:'United States',
  INTERNATIONAL:'International',
}

export function CorpusDashboard(){
  const [query,setQuery]=useState('')
  const [layer,setLayer]=useState<AuthorityLayer|''>('')
  const [selectedId,setSelectedId]=useState('NLC-CON-001')
  const stats=useMemo(()=>corpusStats(corpusRecords),[])
  const results=useMemo(()=>searchCorpus(corpusRecords,{text:query,layers:layer?[layer]:undefined}),[query,layer])
  const graph=useMemo(()=>getAuthorityGraph(selectedId,corpusRecords),[selectedId])

  return <>
    <section className="stats corpusstats">
      <div className="card stat"><div><span>Corpus Records</span><strong>{stats.total}</strong><small>Seeded authority records</small></div><BookOpen size={22}/></div>
      <div className="card stat"><div><span>Immutable Sources</span><strong>{stats.immutable}</strong><small>Historical originals locked</small></div><FileLock2 size={22}/></div>
      <div className="card stat"><div><span>Primary Verified</span><strong>{stats.verified}</strong><small>Independent primary-source confirmation</small></div><FileCheck2 size={22}/></div>
      <div className="card stat"><div><span>Verification Queue</span><strong>{stats.unverified}</strong><small>Requires source authentication</small></div><ShieldCheck size={22}/></div>
    </section>

    <section className="card corpussearch">
      <div className="searchbox"><Search size={17}/><input aria-label="Search legal corpus" placeholder="Search title, ID, tag, authority or summary…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <div className="filterbox"><Filter size={16}/><select aria-label="Filter authority layer" value={layer} onChange={e=>setLayer(e.target.value as AuthorityLayer|'')}><option value="">All authority layers</option>{Object.entries(layerLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
    </section>

    <section className="corpuslayout">
      <div className="card corpuslist">
        <div className="paneltitle"><div><span>Authority Register</span><small>{results.length} matching records</small></div><BookOpen size={18}/></div>
        <div className="corpusrows">{results.map(record=><button key={record.id} className={selectedId===record.id?'corpusrow selected':'corpusrow'} onClick={()=>setSelectedId(record.id)}><div><b className="mono">{record.id}</b><strong>{record.shortTitle??record.title}</strong><small>{record.instrumentType} • {layerLabels[record.authorityLayer]}</small></div><span className={'verify '+record.verification.toLowerCase()}>{record.verification.replaceAll('_',' ')}</span></button>)}</div>
      </div>

      <div className="card corpusdetail">
        {graph.root ? <>
          <div className="paneltitle"><div><span>{graph.root.shortTitle??graph.root.title}</span><small className="mono">{graph.root.id}</small></div><FileLock2 size={18}/></div>
          <p>{graph.root.summary}</p>
          <dl className="authoritymeta">
            <div><dt>Issuing authority</dt><dd>{graph.root.issuingAuthority}</dd></div>
            <div><dt>Authority layer</dt><dd>{layerLabels[graph.root.authorityLayer]}</dd></div>
            <div><dt>Status</dt><dd>{graph.root.status}</dd></div>
            <div><dt>Verification</dt><dd>{graph.root.verification.replaceAll('_',' ')}</dd></div>
            <div><dt>Date</dt><dd>{graph.root.date??'Not recorded'}</dd></div>
            <div><dt>Source era</dt><dd>{graph.root.sourceEra??'—'}</dd></div>
            <div><dt>Jurisdiction / scope</dt><dd>{graph.root.jurisdictionScope}</dd></div>
            <div><dt>Immutability</dt><dd>{graph.root.immutable?'LOCKED — addenda only':'Mutable working record'}</dd></div>
          </dl>
          <div className="tagrow">{graph.root.tags.map(tag=><span key={tag}>{tag}</span>)}</div>
          {graph.root.sourceUrl&&<p className="sourcehint">Source locator recorded: {graph.root.sourceUrl}</p>}
          <div className="related"><div className="paneltitle"><div><span>Authority Graph</span><small>Parent, child and cross-reference links</small></div><Link2 size={18}/></div>{graph.related.length?<ul>{graph.related.map(record=><li key={record.id}><button onClick={()=>setSelectedId(record.id)}><span className="mono">{record.id}</span> {record.shortTitle??record.title}</button></li>)}</ul>:<p>No linked authorities recorded yet.</p>}</div>
        </>:<p>Select a Corpus authority.</p>}
      </div>
    </section>

    <section className="card focus"><ShieldCheck size={26}/><h2>Corpus Integrity Rule</h2><p>Historical records are immutable. Corrections, later interpretation, verification findings and doctrinal developments are stored as separate addenda, authority notes or superseding instruments. The engine never silently rewrites an original source.</p></section>
  </>
}
