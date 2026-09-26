import React,{useMemo,useState} from 'react'
import {ArrowLeft,CheckCircle2,Copy,MessageSquareText,RefreshCw,Send,ShieldCheck,Sparkles} from 'lucide-react'
import {generateShemsiReply,type ShemsiTone} from './shemsiClient'
import './shemsi.css'

const tones:ShemsiTone[]=['professional','warm','concise','educational','witty','measured']

export function ShemsiCommentAssistantApp(){
  const[platform,setPlatform]=useState('facebook')
  const[authorName,setAuthorName]=useState('')
  const[parentContentText,setParentContentText]=useState('')
  const[commentText,setCommentText]=useState('')
  const[tone,setTone]=useState<ShemsiTone>('professional')
  const[draft,setDraft]=useState('')
  const[approved,setApproved]=useState(false)
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState('')
  const count=draft.length
  const canGenerate=commentText.trim().length>0&&!loading
  const stateLabel=approved?'Approved draft':draft?'Pending approval':'No draft yet'

  async function generate(){
    setLoading(true);setError('');setApproved(false)
    try{
      const result=await generateShemsiReply({platform,authorName,commentText,parentContentText,tone,maxLength:600})
      setDraft(result.text)
    }catch(err){setError(err instanceof Error?err.message:'generation_failed')}
    finally{setLoading(false)}
  }

  const summary=useMemo(()=>[
    ['Platform',platform.toUpperCase()],
    ['Tone',tone],
    ['Status',stateLabel],
  ],[platform,tone,stateLabel])

  return <main className="shemsi-page">
    <header className="shemsi-topbar">
      <div className="shemsi-brand"><div className="shemsi-mark">S</div><div><strong>Shemsi</strong><span>NEO Social · Comment Assistant</span></div></div>
      <button className="shemsi-ghost" onClick={()=>{window.location.hash='/'}}><ArrowLeft size={16}/> NEO Home</button>
    </header>

    <section className="shemsi-hero">
      <div><span className="shemsi-kicker">ENGAGEMENT CONTROL</span><h1>Turn comments into clear, on-brand replies.</h1><p>Draft with NEO AI, edit in place, and keep publishing behind an explicit approval gate.</p></div>
      <div className="shemsi-status"><ShieldCheck size={18}/><div><b>Human approval required</b><span>Generation never publishes automatically.</span></div></div>
    </section>

    <section className="shemsi-grid">
      <div className="shemsi-card">
        <div className="shemsi-card-head"><div><span className="shemsi-label">01 · INTAKE</span><h2>Comment context</h2></div><MessageSquareText size={20}/></div>
        <div className="shemsi-fields">
          <label>Platform<select value={platform} onChange={e=>setPlatform(e.target.value)}>{['facebook','instagram','linkedin','x','tiktok','youtube'].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label>Author name <span>optional</span><input value={authorName} onChange={e=>setAuthorName(e.target.value)} placeholder="Comment author"/></label>
          <label>Parent post / context <span>optional</span><textarea value={parentContentText} onChange={e=>setParentContentText(e.target.value)} placeholder="Paste the post, caption, or context Shemsi should understand."/></label>
          <label>Incoming comment<textarea className="shemsi-comment" value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Paste the comment here."/></label>
        </div>
        <div className="shemsi-tone-row">{tones.map(x=><button key={x} className={tone===x?'active':''} onClick={()=>setTone(x)}>{x}</button>)}</div>
        <button className="shemsi-primary" disabled={!canGenerate} onClick={()=>void generate()}>{loading?<><RefreshCw className="spin" size={17}/>Generating…</>:<><Sparkles size={17}/>Generate reply</>}</button>
        {error&&<div className="shemsi-error">{error}</div>}
      </div>

      <div className="shemsi-card shemsi-draft-card">
        <div className="shemsi-card-head"><div><span className="shemsi-label">02 · REVIEW</span><h2>Reply draft</h2></div><span className={approved?'shemsi-pill approved':'shemsi-pill'}>{stateLabel}</span></div>
        <textarea className="shemsi-draft" value={draft} onChange={e=>{setDraft(e.target.value);setApproved(false)}} placeholder="Your generated reply will appear here."/>
        <div className="shemsi-draft-meta"><span>{count}/600</span><button onClick={()=>draft&&navigator.clipboard.writeText(draft)} disabled={!draft}><Copy size={14}/> Copy</button></div>
        <div className="shemsi-summary">{summary.map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
        <div className="shemsi-actions">
          <button className="shemsi-secondary" disabled={!draft||loading} onClick={()=>void generate()}><RefreshCw size={16}/>Regenerate</button>
          <button className="shemsi-approve" disabled={!draft||approved} onClick={()=>setApproved(true)}><CheckCircle2 size={16}/>{approved?'Approved':'Approve draft'}</button>
        </div>
        <div className="shemsi-publish-note"><Send size={16}/><div><b>Publishing adapter not enabled in this gate.</b><span>Approved drafts are ready for the next NEO Social platform-execution gate.</span></div></div>
      </div>
    </section>
  </main>
}
