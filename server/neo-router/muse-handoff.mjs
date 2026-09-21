import { createHash } from 'node:crypto'

const MAX_HANDOFF_CHARS = 48000

function clean(value){
  return String(value ?? '').replace(/\r\n/g,'\n').trim().slice(0,MAX_HANDOFF_CHARS)
}

function collectText(value, out=[]){
  if(out.join('\n').length>=MAX_HANDOFF_CHARS) return out
  if(typeof value==='string'){
    const text=value.trim()
    if(text) out.push(text)
    return out
  }
  if(Array.isArray(value)){
    for(const item of value) collectText(item,out)
    return out
  }
  if(!value||typeof value!=='object') return out

  const role=typeof value.role==='string'?value.role.trim():''
  for(const key of ['text','content','message','output_text','input_text']){
    const v=value[key]
    if(typeof v==='string'&&v.trim()){
      out.push(role?`${role}: ${v.trim()}`:v.trim())
      return out
    }
  }
  for(const v of Object.values(value)) collectText(v,out)
  return out
}

export function parseMuseHandoff({sourceType='muse-app-copy',content,filename}={}){
  const raw=clean(content)
  if(!raw) throw new Error('handoff_content_required')

  let normalized=raw
  let format='text'
  if(sourceType==='muse-code-trajectory'||String(filename||'').toLowerCase().endsWith('.json')){
    try{
      const parsed=JSON.parse(raw)
      const collected=collectText(parsed,[])
      if(collected.length) normalized=clean(collected.join('\n\n'))
      format='json'
    }catch{
      if(sourceType==='muse-code-trajectory') throw new Error('invalid_handoff_json')
    }
  }else if(sourceType==='muse-code-transcript'){
    format='transcript'
  }

  const sourceApp=sourceType.startsWith('muse-code')?'Muse Code':'Meta Muse app'
  const hash=createHash('sha256').update(raw).digest('hex')
  return {
    sourceType,
    sourceApp,
    format,
    filename:filename?String(filename).slice(0,240):null,
    contentHash:`sha256:${hash}`,
    context:normalized,
    characterCount:normalized.length,
  }
}
