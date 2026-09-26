export const SHEMSI_VIBES = [
  {id:'Insightful',desc:'Depth + temple lens'},
  {id:'Supportive',desc:'Warm, grounded'},
  {id:'Curious Question',desc:'Sparks dialogue'},
  {id:'Houston Local',desc:'City-rooted'},
  {id:'Short & Punchy',desc:'High volume reels'},
] as const

export type ShemsiVibe=(typeof SHEMSI_VIBES)[number]['id']

export const SHEMSI_SAFETY_CHECKLIST=[
  'No generic “Nice! / 🔥🔥🔥”',
  'No spam, no link drops, no DM bait',
  'Add personal touch — reference their post',
] as const

export const SHEMSI_BRAND_VOICE={
  name:'Dr. Lawiy Zodok Shamu-El',
  handle:'@shemsizedek',
  description:'spiritual, grounded, world temple, true culture, consciousness — no cringe hustle speak. Houston-rooted, ancestrally literate, temple-disciplined.',
  tags:['spiritual','grounded','world temple','true culture','consciousness','HTX','no cringe'],
} as const

export type ShemsiVoiceDraft={
  id:string
  type:'value'|'question'|'punchy'
  label:'Value-add'|'Curiosity question'|'Short punchy'
  text:string
  vibe:ShemsiVibe
}

function cleanTags(tags:string[]){
  return tags.map(x=>x.trim().toLowerCase()).filter(Boolean)
}

export function inferShemsiNiche(context:string,tags:string[]){
  const normalized=cleanTags(tags)
  if(normalized.length>0)return normalized[0]
  const matched=context.toLowerCase().match(/\b(spirituality|temple|culture|consciousness|wellness|healing|ritual|ancestral|houston|community|practice)\b/)
  if(matched)return matched[0]
  const first=context.split(/\s+/).slice(0,4).join(' ').replace(/[^a-zA-Z ]/g,'').trim()
  return first.length>3?first:'this work'
}

function choose<T>(items:T[],random:()=>number){
  return items[Math.floor(random()*items.length)]!
}

function id(random:()=>number){
  return random().toString(36).slice(2)||'shemsi'
}

export function generateOriginalShemsiDrafts(
  vibe:ShemsiVibe,
  context:string,
  tags:string[],
  random:()=>number=Math.random,
):ShemsiVoiceDraft[]{
  const niche=inferShemsiNiche(context,tags)
  const title=niche.charAt(0).toUpperCase()+niche.slice(1)
  const houston=cleanTags(tags).join(' ').includes('houston')||context.toLowerCase().includes('houston')||vibe==='Houston Local'

  const templates:Record<ShemsiVibe,{value:string[];question:string[];punchy:string[]}>={
    Insightful:{
      value:[
        `${title} as daily discipline — not aesthetic. This lands deep.`,
        `This is true culture: ${niche} embodied, not performed. Grounded.`,
        `World temple work looks like this. ${title} held with presence.`,
        `${title} isn't content, it's consciousness in form. Respect.`,
      ],
      question:[
        `When did ${niche} shift from idea to embodied practice for you?`,
        `How do you keep ${niche} grounded when algorithms reward hype?`,
        `What does temple-level discipline look like in your ${niche} work?`,
      ],
      punchy:[`Temple over trend. ${title} embodied.`,'Consciousness first. Always.','Real culture. No cringe.'],
    },
    Supportive:{
      value:[
        `Felt this. Thank you for holding ${niche} with such clarity and care.`,
        `This kind of ${niche} work is needed. Steady, grounded, true.`,
        `Appreciate how you model ${niche} — soft power, no hustle.`,
        `Your ${niche} practice is visible here. Honoring the depth.`,
      ],
      question:[
        `What’s been supporting you to stay grounded in this ${niche} season?`,
        `How has your community responded to this layer of ${niche}?`,
        `What part of this ${niche} journey surprised you most?`,
      ],
      punchy:[`Holding space for this. Beautiful ${niche}.`,'Needed this today. Thank you.','Grounded and true. Love it here.'],
    },
    'Curious Question':{
      value:[
        `Curious — do you see ${niche} as temple practice or cultural memory? Both?`,
        `${title} hits different when it’s lived. How do you anchor it?`,
        `This opens something. ${niche} as return, not invention.`,
        `Noticing how you frame ${niche} — what lineage informs this?`,
      ],
      question:[
        `If someone new to ${niche} asked where to start, what’s the first practice?`,
        `What’s one myth about ${niche} you wish Houston unlearned?`,
        `How does ${niche} change when you treat it as world temple work?`,
      ],
      punchy:[`Wait — what’s your take on ${niche} vs true culture?`,'More of this lens please.',`Question: what’s ${niche} without performance?`],
    },
    'Houston Local':{
      value:[
        `Houston needs more ${niche} like this. Grounded, not gimmick.`,
        `This is H-Town wellness done right. ${title} with roots.`,
        `From Third Ward to temple — ${niche} still lives here. Respect.`,
        `Local culture > imported hustle. This ${niche} work proves it.`,
      ],
      question:[
        `Where in Houston do you feel ${niche} is most alive right now?`,
        `How does Houston shape the way you practice ${niche}?`,
        `What would it look like to build temple space for ${niche} in HTX?`,
      ],
      punchy:[houston?`HTX temple energy. This ${niche}.`:`HTX needs this ${niche}. Fr.`,'Houston culture. Real one.','Southwest to temple — love this.'],
    },
    'Short & Punchy':{
      value:[
        `${title}. Embodied. No fluff, just true work.`,
        `Clear, grounded, needed. This is ${niche}.`,
        `Real ${niche} > aesthetic ${niche}. You get it.`,
        `Less hustle, more temple. ${title}.`,
      ],
      question:[`What’s your non-negotiable for ${niche}?`,`How do you define true ${niche}?`,`${title} — practice or remembrance?`],
      punchy:['Temple.',`${title} embodied. 🔥`,'Needed. Grounded. True.'],
    },
  }

  const set=templates[vibe]
  let value=choose(set.value,random)
  if(value.length>90)value=value.slice(0,87)+'...'
  if(value.length<40)value=`${value} This is the work.`
  if(value.length>90)value=value.substring(0,90).trim()

  return [
    {id:id(random),type:'value',label:'Value-add',text:value,vibe},
    {id:id(random),type:'question',label:'Curiosity question',text:choose(set.question,random),vibe},
    {id:id(random),type:'punchy',label:'Short punchy',text:choose(set.punchy,random),vibe},
  ]
}
