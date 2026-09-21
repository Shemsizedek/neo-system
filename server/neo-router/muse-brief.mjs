const MAX_BRIEF_MESSAGES = 12
const MAX_TEXT = 6000

function clean(value,max=MAX_TEXT){
  return String(value??'').replace(/\r\n/g,'\n').trim().slice(0,max)
}

function redactSecrets(value){
  return clean(value)
    .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi,'Bearer [REDACTED]')
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g,'[REDACTED_API_KEY]')
    .replace(/\bLLM\|[^\s]+/g,'[REDACTED_MODEL_API_KEY]')
    .replace(/\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|jwt[_-]?secret)\s*[:=]\s*[^\s,;]+/gi,'$1=[REDACTED]')
}

function label(role,provider){
  if(role==='user') return 'User'
  if(role==='assistant') return provider ? 'NEOsync / '+provider : 'NEOsync'
  if(role==='external') return provider ? 'Imported '+provider : 'Imported source'
  return 'Context'
}

export function buildMuseBrief({thread,knowledge=[]}={}){
  if(!thread?.id) throw new Error('thread_required')
  const messages=(Array.isArray(thread.messages)?thread.messages:[])
    .slice(-MAX_BRIEF_MESSAGES)
    .map(message=>({role:message.role,provider:message.provider??null,text:redactSecrets(message.text)}))
    .filter(message=>message.text)
  const lastUser=[...messages].reverse().find(message=>message.role==='user')
  const knowledgeTitles=[...new Set((Array.isArray(knowledge)?knowledge:[]).map(item=>clean(item?.title,240)).filter(Boolean))]
  const imported=(Array.isArray(thread.handoffs)?thread.handoffs:[]).map(item=>({
    sourceApp:clean(item?.sourceApp,120),
    sourceType:clean(item?.sourceType,120),
    importedAt:clean(item?.importedAt,80),
  }))
  const out=[
    'NEO → MUSE HANDOFF BRIEF',
    '',
    'Use this as context for a new Muse app conversation. This brief does not carry or resume the NEO/Meta API session.',
    '',
    'Project / Thread: '+redactSecrets(thread.title||'NEOsync Thread'),
    'Current objective: '+(lastUser?.text||'Continue the work represented in the context below.'),
  ]
  if(knowledgeTitles.length){
    out.push('','Approved NEO knowledge references:')
    knowledgeTitles.forEach(title=>out.push('- '+title))
  }
  if(imported.length){
    out.push('','Imported-source provenance:')
    imported.forEach(item=>out.push('- '+(item.sourceApp||'External source')+(item.sourceType?' ('+item.sourceType+')':'')+(item.importedAt?' · imported '+item.importedAt:'')))
  }
  if(messages.length){
    out.push('','Recent working context:')
    for(const message of messages) out.push(label(message.role,message.provider)+': '+message.text)
  }
  out.push(
    '',
    'Working instructions for Muse:',
    '- Continue from the context above without claiming access to the NEOsync API session.',
    '- Preserve established NEO terminology where present.',
    '- Distinguish sourced facts, internal NEO doctrine/records, interpretation, and unknowns.',
    '- Ask for clarification only when the missing detail materially blocks the task.',
  )
  return {
    brief:out.join('\n'),
    messageCount:messages.length,
    knowledgeTitles,
    importedSourceCount:imported.length,
    sessionLinkage:'new-muse-app-conversation',
  }
}
