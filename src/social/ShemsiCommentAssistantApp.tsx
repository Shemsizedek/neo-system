import React,{useMemo,useState} from 'react'
import {ArrowLeft,CheckCircle2,Copy,MessageSquareText,RefreshCw,Send,ShieldCheck,Sparkles} from 'lucide-react'
import {approveShemsiDraft,generateShemsiReply,publishShemsiDraft,saveShemsiDraft,stageShemsiInbox,syncShemsiComments,verifyShemsiDraft,type ShemsiTone} from './shemsiClient'
import {generateOriginalShemsiDrafts,SHEMSI_BRAND_VOICE,SHEMSI_SAFETY_CHECKLIST,SHEMSI_VIBES,type ShemsiVibe,type ShemsiVoiceDraft} from './shemsiVoiceEngine'
import './shemsi.css'

const tones:ShemsiTone[]=['professional','warm','concise','educational','witty','measured']
type InboxItem={id:string;platform:string;accountId:string;commentId:string;parentContentId:string;authorName?:string|null;commentText:string;parentContentText?:string|null;triage?:{priority?:string;disposition?:string}}

export function ShemsiCommentAssistantApp(){
  const[platform,setPlatform]=useState('facebook')
  const[accountId,setAccountId]=useState('')
  const[commentId,setCommentId]=useState('')
  const[parentContentId,setParentContentId]=useState('')
  const[authorName,setAuthorName]=useState('')
  const[parentContentText,setParentContentText]=useState('')
  const[commentText,setCommentText]=useState('')
  const[tone,setTone]=useState<ShemsiTone>('professional')
  const[vibe,setVibe]=useState<ShemsiVibe>('Insightful')
  const[nicheTags,setNicheTags]=useState('spirituality, Houston wellness, temple')
  const[voiceDrafts,setVoiceDrafts]=useState<ShemsiVoiceDraft[]>([])
  const[voiceHistory,setVoiceHistory]=useState<Array<ShemsiVoiceDraft&{timeStr:string}>>([])
  const[draft,setDraft]=useState('')
  const[draftId,setDraftId]=useState('')
  const[approved,setApproved]=useState(false)
  const[publishStatus,setPublishStatus]=useState('')
  const[verificationStatus,setVerificationStatus]=useState('')
  const[inbox,setInbox]=useState<InboxItem[]>([])
  const[loading,setLoading]=useState(false)
  const[error,setError]=useState('')
  const count=draft.length
  const canGenerate=commentText.trim().length>0&&accountId.trim().length>0&&commentId.trim().length>0&&parentContentId.trim().length>0&&!loading
  const stateLabel=verificationStatus||publishStatus||(approved?'Approved draft':draft?'Pending approval':'No draft yet')
  const canSync=(platform==='linkedin'||platform==='youtube')&&parentContentId.trim().length>0&&!loading

  function useInboxItem(item:InboxItem){
    setPlatform(item.platform);setAccountId(item.accountId);setCommentId(item.commentId);setParentContentId(item.parentContentId)
    setAuthorName(item.authorName||'');setCommentText(item.commentText);setParentContentText(item.parentContentText||'')
    setDraft('');setDraftId('');setApproved(false);setPublishStatus('');setVerificationStatus('')
  }

  async function sync(){
    if(!canSync)return
    setLoading(true);setError('')
    try{
      const result=platform==='linkedin'
        ?await syncShemsiComments({platform:'linkedin',activityUrn:parentContentId})
        :await syncShemsiComments({platform:'youtube',videoId:parentContentId})
      const items=(result.items||[]) as InboxItem[]
      setInbox(items)
      if(items[0])useInboxItem(items[0])
    }catch(err){setError(err instanceof Error?err.message:'sync_failed')}
    finally{setLoading(false)}
  }

  function generateOriginalVoice(){
    const context=(parentContentText||commentText).trim()
    const tags=nicheTags.split(',').map(x=>x.trim()).filter(Boolean)
    if(!context&&tags.length===0){setError('caption_or_niche_required');return}
    const options=generateOriginalShemsiDrafts(vibe,context,tags)
    setVoiceDrafts(options)
    const timeStr=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})
    setVoiceHistory(current=>[...options.map(option=>({...option,timeStr})),...current].slice(0,10))
    setError('')
  }

  async function useOriginalVoiceDraft(option:ShemsiVoiceDraft){
    setDraft(option.text);setApproved(false);setPublishStatus('');setVerificationStatus('');setError('')
    if(!accountId.trim()||!commentId.trim()||!parentContentId.trim()){
      setDraftId('')
      setError('Add the authorized account ID, comment ID, and parent content ID before queueing this draft.')
      return
    }
    setLoading(true)
    try{
      const staged=await stageShemsiInbox({platform,accountId,commentId,parentContentId,authorName,commentText,parentContentText})
      const saved=await saveShemsiDraft({inboxId:staged.item.id,responseText:option.text,tone})
      setDraftId(saved.draft.id)
    }catch(err){setError(err instanceof Error?err.message:'voice_draft_queue_failed')}
    finally{setLoading(false)}
  }

  async function generate(){
    setLoading(true);setError('');setApproved(false);setPublishStatus('');setVerificationStatus('');setDraftId('')
    try{
      const staged=await stageShemsiInbox({platform,accountId,commentId,parentContentId,authorName,commentText,parentContentText})
      const result=await generateShemsiReply({platform,authorName,commentText,parentContentText,tone,maxLength:600})
      const saved=await saveShemsiDraft({inboxId:staged.item.id,responseText:result.text,tone})
      setDraft(result.text);setDraftId(saved.draft.id)
    }catch(err){setError(err instanceof Error?err.message:'generation_failed')}
    finally{setLoading(false)}
  }

  async function approve(){
    if(!draftId)return
    setLoading(true);setError('')
    try{const result=await approveShemsiDraft(draftId);setApproved(result.draft.status==='approved')}
    catch(err){setError(err instanceof Error?err.message:'approval_failed')}
    finally{setLoading(false)}
  }

  async function publish(){
    if(!draftId||!approved)return
    setLoading(true);setError('')
    try{
      const result=await publishShemsiDraft(draftId)
      setPublishStatus(result.receipt.published?'Published':result.receipt.status||'Submitted')
    }catch(err){setError(err instanceof Error?err.message:'publish_failed')}
    finally{setLoading(false)}
  }

  async function verify(){
    if(!draftId)return
    setLoading(true);setError('')
    try{
      const result=await verifyShemsiDraft(draftId)
      setVerificationStatus(result.receipt?.verification?.verified?'Verified on platform':result.receipt?.verification?.status||'Not verified')
    }catch(err){setError(err instanceof Error?err.message:'verification_failed')}
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
      <div><span className="shemsi-kicker">ENGAGEMENT CONTROL</span><h1>Turn comments into clear, on-brand replies.</h1><p>Pull authorized comments into the NEO Social inbox, draft with NEO AI, approve explicitly, publish through an authorized adapter, and verify the result.</p></div>
      <div className="shemsi-status"><ShieldCheck size={18}/><div><b>Human approval required</b><span>Ingestion can automate. Publishing cannot skip review.</span></div></div>
    </section>

    <section className="shemsi-grid">
      <div className="shemsi-card">
        <div className="shemsi-card-head"><div><span className="shemsi-label">01 · INBOX</span><h2>Comment context</h2></div><MessageSquareText size={20}/></div>
        <div className="shemsi-fields">
          <label>Platform<select value={platform} onChange={e=>setPlatform(e.target.value)}>{['facebook','instagram','linkedin','x','tiktok','youtube'].map(x=><option key={x} value={x}>{x}</option>)}</select></label>
          <label>Author name <span>optional</span><input value={authorName} onChange={e=>setAuthorName(e.target.value)} placeholder="Comment author"/></label>
          <label>Account / page ID<input value={accountId} onChange={e=>setAccountId(e.target.value)} placeholder="Authorized account ID"/></label>
          <label>Comment ID<input value={commentId} onChange={e=>setCommentId(e.target.value)} placeholder="Platform comment ID"/></label>
          <label>Parent content ID<input value={parentContentId} onChange={e=>setParentContentId(e.target.value)} placeholder="LinkedIn activity URN / YouTube video ID"/></label>
          <label>Parent post / context <span>optional</span><textarea value={parentContentText} onChange={e=>setParentContentText(e.target.value)} placeholder="Paste the post, caption, or context Shemsi should understand."/></label>
          <label>Incoming comment<textarea className="shemsi-comment" value={commentText} onChange={e=>setCommentText(e.target.value)} placeholder="Paste a comment or sync it from a supported platform."/></label>
        </div>
        <button className="shemsi-secondary shemsi-sync" disabled={!canSync} onClick={()=>void sync()}><RefreshCw size={16}/>Sync recent {platform==='linkedin'?'LinkedIn':platform==='youtube'?'YouTube':''} comments</button>
        {inbox.length>0&&<div className="shemsi-inbox-list">{inbox.slice(0,8).map(item=><button key={item.id} onClick={()=>useInboxItem(item)}><span>{item.authorName||'Commenter'} · {item.triage?.priority||'review'}</span><b>{item.commentText}</b></button>)}</div>}

        <div className="shemsi-original-engine">
          <div className="shemsi-original-head"><div><span className="shemsi-label">ORIGINAL VOICE ENGINE</span><h3>{SHEMSI_BRAND_VOICE.name}</h3><p>{SHEMSI_BRAND_VOICE.description}</p></div><span className="shemsi-pill approved">Locked voice</span></div>
          <label className="shemsi-original-tags">Niche tags<input value={nicheTags} onChange={e=>setNicheTags(e.target.value)} placeholder="spirituality, Houston wellness, temple"/></label>
          <div className="shemsi-vibe-grid">{SHEMSI_VIBES.map(item=><button key={item.id} className={vibe===item.id?'active':''} onClick={()=>setVibe(item.id)}><b>{item.id}</b><span>{item.desc}</span></button>)}</div>
          <button className="shemsi-secondary shemsi-original-generate" onClick={generateOriginalVoice}><Sparkles size={16}/>Generate original 3 drafts</button>
          {voiceDrafts.length>0&&<div className="shemsi-original-drafts">{voiceDrafts.map(option=><div key={option.id}><div><span>{option.label}</span><small>{option.text.length} chars</small></div><p>{option.text}</p><button onClick={()=>void useOriginalVoiceDraft(option)}>Use + queue</button></div>)}</div>}
          <div className="shemsi-safety">{SHEMSI_SAFETY_CHECKLIST.map(item=><span key={item}>✓ {item}</span>)}</div>
          {voiceHistory.length>0&&<div className="shemsi-history"><div><b>History — last 10</b><button onClick={()=>setVoiceHistory([])}>Clear</button></div>{voiceHistory.map(item=><button key={item.id} onClick={()=>void navigator.clipboard.writeText(item.text)}><span>{item.type} · {item.vibe} · {item.timeStr}</span><b>{item.text}</b></button>)}</div>}
        </div>

        <div className="shemsi-ai-label">NEO AI tone</div>
        <div className="shemsi-tone-row">{tones.map(x=><button key={x} className={tone===x?'active':''} onClick={()=>setTone(x)}>{x}</button>)}</div>
        <button className="shemsi-primary" disabled={!canGenerate} onClick={()=>void generate()}>{loading?<><RefreshCw className="spin" size={17}/>Working…</>:<><Sparkles size={17}/>Generate NEO AI + queue</>}</button>
        {error&&<div className="shemsi-error">{error}</div>}
      </div>

      <div className="shemsi-card shemsi-draft-card">
        <div className="shemsi-card-head"><div><span className="shemsi-label">02 · REVIEW</span><h2>Reply draft</h2></div><span className={approved?'shemsi-pill approved':'shemsi-pill'}>{stateLabel}</span></div>
        <textarea className="shemsi-draft" value={draft} onChange={e=>{setDraft(e.target.value);setApproved(false);setPublishStatus('');setVerificationStatus('')}} placeholder="Your generated reply will appear here."/>
        <div className="shemsi-draft-meta"><span>{count}/600</span><button onClick={()=>draft&&navigator.clipboard.writeText(draft)} disabled={!draft}><Copy size={14}/> Copy</button></div>
        <div className="shemsi-summary">{summary.map(([k,v])=><div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
        <div className="shemsi-actions">
          <button className="shemsi-secondary" disabled={!draft||loading} onClick={()=>void generate()}><RefreshCw size={16}/>Regenerate</button>
          <button className="shemsi-approve" disabled={!draftId||approved||loading} onClick={()=>void approve()}><CheckCircle2 size={16}/>{approved?'Approved':'Approve draft'}</button>
        </div>
        <button className="shemsi-primary shemsi-publish-button" disabled={!approved||loading||publishStatus==='Published'} onClick={()=>void publish()}><Send size={16}/>{publishStatus==='Published'?'Published':'Publish approved reply'}</button>
        <button className="shemsi-secondary shemsi-verify-button" disabled={!draftId||!publishStatus||loading} onClick={()=>void verify()}><ShieldCheck size={16}/>Verify platform receipt</button>
        <div className="shemsi-publish-note"><ShieldCheck size={16}/><div><b>Adapter status is authoritative.</b><span>LinkedIn and YouTube support automated ingestion and readback in this gate. Unsupported platforms remain non-publishing/non-ingesting until verified adapters exist.</span></div></div>
      </div>
    </section>
  </main>
}
