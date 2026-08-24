import { createMissionEngine } from './mission-engine.mjs'
import { createMissionStateStore } from './persistent-store.mjs'

export function createPersistentMissionRuntime({store=createMissionStateStore(),clock,idFactory}={}){
  async function withEngine(mutator,{persist=true}={}){
    const state=await store.load()
    const engine=createMissionEngine({clock,idFactory,initialState:state})
    const result=await mutator(engine)
    if(persist) await store.save(engine.snapshot())
    return result
  }
  async function telemetry(options){
    const state=await store.load()
    const engine=createMissionEngine({clock,idFactory,initialState:state})
    const data=engine.telemetry(options)
    return {...data,persistence:{mode:store.mode,durable:store.durable}}
  }
  return Object.freeze({withEngine,telemetry,store})
}
