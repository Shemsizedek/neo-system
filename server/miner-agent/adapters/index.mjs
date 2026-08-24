import {createReferenceAdapter} from './reference.mjs'
import {createAntminerAdapter} from './antminer.mjs'
import {createWhatsMinerAdapter} from './whatsminer.mjs'

export function createAdapter(config={}){
  const type=String(config.adapter||config.vendor||'REFERENCE').toUpperCase()
  if(['ANTMINER','ANTMINER_STYLE','BITMAIN'].includes(type)) return createAntminerAdapter(config)
  if(['WHATSMINER','WHATSMINER_STYLE','MICROBT'].includes(type)) return createWhatsMinerAdapter(config)
  return createReferenceAdapter(config)
}
