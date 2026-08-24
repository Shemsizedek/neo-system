import {verifyEvent} from './agent.mjs'

export class ReplayWindow {
  constructor(ttlMs=5*60_000){this.ttlMs=ttlMs;this.nonces=new Map()}
  prune(now=Date.now()){for(const [nonce,expires] of this.nonces) if(expires<=now)this.nonces.delete(nonce)}
  accept(nonce,now=Date.now()){
    this.prune(now)
    if(this.nonces.has(nonce))return false
    this.nonces.set(nonce,now+this.ttlMs)
    return true
  }
}

export function validateEnvelopeShape(envelope){
  if(!envelope||typeof envelope!=='object')return 'Envelope must be an object'
  for(const key of ['agentId','minerId','type','occurredAt','nonce','payload','signature']) if(!envelope[key])return `Missing envelope field: ${key}`
  if(!['TELEMETRY','SHARE','HEARTBEAT','ALERT'].includes(envelope.type))return 'Unsupported event type'
  const ts=Date.parse(envelope.occurredAt)
  if(!Number.isFinite(ts))return 'Invalid occurredAt timestamp'
  return null
}

export function verifyAgentEnvelope(envelope,registry,replayWindow=new ReplayWindow(),now=Date.now()){
  const shapeError=validateEnvelopeShape(envelope)
  if(shapeError)return {ok:false,reason:shapeError}
  const agent=registry.find(a=>a.agentId===envelope.agentId&&a.minerId===envelope.minerId&&a.enabled)
  if(!agent)return {ok:false,reason:'Unknown or disabled agent'}
  const age=Math.abs(now-Date.parse(envelope.occurredAt))
  if(age>5*60_000)return {ok:false,reason:'Event timestamp outside replay window'}
  if(!replayWindow.accept(envelope.nonce,now))return {ok:false,reason:'Replay detected'}
  const {signature,...body}=envelope
  if(!verifyEvent(body,signature,agent.publicKeyPem))return {ok:false,reason:'Invalid signature'}
  return {ok:true,agent,event:{...body,verified:true}}
}

export function telemetryToGatewayRecord(event){
  if(event.type!=='TELEMETRY')throw new Error('Expected TELEMETRY event')
  const p=event.payload||{}
  return {
    minerId:event.minerId,
    receivedAt:new Date().toISOString(),
    occurredAt:event.occurredAt,
    hashrateTh:Number(p.hashrateTh||0),
    powerW:Number(p.powerW||0),
    temperatureC:Number(p.temperatureC||0),
    fanRpm:Number(p.fanRpm||0),
    acceptedShares:Number(p.acceptedShares||0),
    rejectedShares:Number(p.rejectedShares||0),
    pool:String(p.pool||''),
    worker:String(p.worker||''),
    firmware:String(p.firmware||''),
    verified:true
  }
}
