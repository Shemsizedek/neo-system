import crypto from 'node:crypto'
import {assertNoSecrets} from './composer.mjs'

const COMPONENT_TYPES=new Set(['CASH_DISPENSER','CASH_ACCEPTOR','RECEIPT_PRINTER','BARCODE_SCANNER','QR_SCANNER','CARD_READER','NFC_READER','SECURE_ELEMENT','PIN_PAD','CAMERA','UPS','NETWORK'])
const HEALTH_STATES=new Set(['ONLINE','DEGRADED','OFFLINE','LOCKED'])

function hash(value){return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex')}

export function normalizeDeviceRegistration(input={}){
  assertNoSecrets(input)
  const deviceId=String(input.deviceId||'').trim()
  const manufacturer=String(input.manufacturer||'GENERIC').trim()
  const model=String(input.model||'').trim()
  const serialNumber=String(input.serialNumber||'').trim()
  const components=Array.isArray(input.components)?input.components:[]
  if(!deviceId)throw new Error('MISSING_DEVICE_ID')
  if(!model)throw new Error('MISSING_MODEL')
  if(!serialNumber)throw new Error('MISSING_SERIAL_NUMBER')
  const normalizedComponents=components.map((component,index)=>{
    const type=String(component?.type||'').trim().toUpperCase()
    if(!COMPONENT_TYPES.has(type))throw new Error(`UNSUPPORTED_COMPONENT_TYPE:${index}`)
    return {id:String(component.id||`${deviceId}-${type}-${index+1}`),type,vendor:String(component.vendor||manufacturer),model:String(component.model||''),status:HEALTH_STATES.has(component.status)?component.status:'ONLINE',capabilities:Array.isArray(component.capabilities)?component.capabilities.map(String):[]}
  })
  const record={deviceId,manufacturer,model,serialNumber,components:normalizedComponents,registeredAt:new Date().toISOString(),vendorNeutral:true}
  return {...record,registrationHash:hash(record)}
}

export function evaluateHeartbeat(input={}){
  assertNoSecrets(input)
  const deviceId=String(input.deviceId||'').trim()
  if(!deviceId)throw new Error('MISSING_DEVICE_ID')
  const observedAt=String(input.observedAt||new Date().toISOString())
  const temperatureC=Number(input.temperatureC)
  const batteryPercent=Number(input.batteryPercent)
  const networkLatencyMs=Number(input.networkLatencyMs)
  const tamper=Boolean(input.tamperDetected)
  const componentStates=Array.isArray(input.componentStates)?input.componentStates:[]
  const offlineComponents=componentStates.filter(c=>String(c.status).toUpperCase()==='OFFLINE').map(c=>String(c.id||c.type||'UNKNOWN'))
  const degradedComponents=componentStates.filter(c=>String(c.status).toUpperCase()==='DEGRADED').map(c=>String(c.id||c.type||'UNKNOWN'))
  let status='ONLINE'
  const reasons=[]
  if(tamper){status='LOCKED';reasons.push('TAMPER_DETECTED')}
  if(offlineComponents.length){status=status==='LOCKED'?status:'OFFLINE';reasons.push('COMPONENT_OFFLINE')}
  if(!offlineComponents.length&&degradedComponents.length&&status==='ONLINE'){status='DEGRADED';reasons.push('COMPONENT_DEGRADED')}
  if(Number.isFinite(temperatureC)&&(temperatureC<0||temperatureC>50)){status=status==='LOCKED'?status:'DEGRADED';reasons.push('TEMPERATURE_OUT_OF_RANGE')}
  if(Number.isFinite(batteryPercent)&&batteryPercent<20){status=status==='LOCKED'?status:'DEGRADED';reasons.push('LOW_BACKUP_POWER')}
  if(Number.isFinite(networkLatencyMs)&&networkLatencyMs>3000){status=status==='LOCKED'?status:'DEGRADED';reasons.push('HIGH_NETWORK_LATENCY')}
  const heartbeat={deviceId,observedAt,status,reasons,telemetry:{temperatureC:Number.isFinite(temperatureC)?temperatureC:null,batteryPercent:Number.isFinite(batteryPercent)?batteryPercent:null,networkLatencyMs:Number.isFinite(networkLatencyMs)?networkLatencyMs:null,tamperDetected:tamper},componentStates,remoteTransactionsAllowed:status==='ONLINE'}
  return {...heartbeat,heartbeatHash:hash(heartbeat)}
}

export function buildRemoteLockout(input={}){
  assertNoSecrets(input)
  const deviceId=String(input.deviceId||'').trim()
  const reason=String(input.reason||'').trim()
  const confirmation=String(input.confirmation||'').trim()
  if(!deviceId)throw new Error('MISSING_DEVICE_ID')
  if(!reason)throw new Error('MISSING_LOCKOUT_REASON')
  if(confirmation!=='LOCK_DEVICE')throw new Error('EXPLICIT_LOCKOUT_CONFIRMATION_REQUIRED')
  const command={commandId:`LOCK-${crypto.randomUUID()}`,deviceId,command:'LOCK_TRANSACTIONS',reason,issuedAt:new Date().toISOString(),cashDispenserEnabled:false,cashAcceptorEnabled:false,cardReaderEnabled:false,networkHeartbeatEnabled:true,requiresLocalServiceToUnlock:true}
  return {...command,commandHash:hash(command)}
}

export function hardwareCapabilities(){return {vendorNeutral:true,componentTypes:[...COMPONENT_TYPES],remoteLockout:true,remoteUnlock:false,localServiceRequiredForUnlock:true,privateKeyStorage:false}}
