export function normalizeTelemetry(raw){
  return {
    hashrateTh:Number(raw.hashrateTh||0),
    powerW:Number(raw.powerW||0),
    temperatureC:Number(raw.temperatureC||0),
    fanRpm:Number(raw.fanRpm||0),
    acceptedShares:Number(raw.acceptedShares||0),
    rejectedShares:Number(raw.rejectedShares||0),
    uptimeSeconds:Number(raw.uptimeSeconds||0),
    pool:String(raw.pool||''),
    worker:String(raw.worker||''),
    firmware:String(raw.firmware||''),
    source:String(raw.source||'REFERENCE_ADAPTER')
  }
}

export function createReferenceAdapter(config={}){
  return {
    async readTelemetry(){
      if(config.referenceTelemetry) return normalizeTelemetry(config.referenceTelemetry)
      return normalizeTelemetry({
        hashrateTh:0,
        powerW:0,
        temperatureC:0,
        fanRpm:0,
        acceptedShares:0,
        rejectedShares:0,
        uptimeSeconds:0,
        pool:'',
        worker:'',
        firmware:'UNCONFIGURED',
        source:'REFERENCE_ADAPTER'
      })
    }
  }
}
