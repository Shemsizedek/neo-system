export const DIFF1_TARGET=(0xffffn<<208n)

export function targetFromDifficulty(difficulty){
  const d=Number(difficulty)
  if(!Number.isFinite(d)||d<=0)throw new Error('INVALID_DIFFICULTY')
  return DIFF1_TARGET/BigInt(Math.max(1,Math.floor(d)))
}

export function createDifficultyState({difficulty=1024,minDifficulty=1,maxDifficulty=1_000_000,targetShareSeconds=15,windowShares=12}={}){
  return {difficulty:Number(difficulty),minDifficulty:Number(minDifficulty),maxDifficulty:Number(maxDifficulty),targetShareSeconds:Number(targetShareSeconds),windowShares:Number(windowShares),acceptedAt:[]}
}

export function recordAcceptedShare(state,{at=Date.now()}={}){
  const acceptedAt=[...state.acceptedAt,Number(at)].slice(-Math.max(2,state.windowShares))
  if(acceptedAt.length<2)return {...state,acceptedAt}
  const elapsed=(acceptedAt.at(-1)-acceptedAt[0])/1000
  const avg=elapsed/(acceptedAt.length-1)
  let difficulty=state.difficulty
  if(avg<state.targetShareSeconds*0.5)difficulty=Math.min(state.maxDifficulty,Math.ceil(difficulty*2))
  else if(avg>state.targetShareSeconds*2)difficulty=Math.max(state.minDifficulty,Math.max(1,Math.floor(difficulty/2)))
  return {...state,acceptedAt,difficulty}
}

export function difficultyMessage(difficulty){
  if(!(Number(difficulty)>0))throw new Error('INVALID_DIFFICULTY')
  return Object.freeze({id:null,method:'mining.set_difficulty',params:[Number(difficulty)]})
}
