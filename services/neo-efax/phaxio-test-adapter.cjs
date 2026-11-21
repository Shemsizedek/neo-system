'use strict';
// Strictly local simulation: no HTTP, API key or transmission.
const crypto=require('node:crypto');
function createPhaxioTestAdapter({enabled=false}={}){
 return Object.freeze({
  provider:'phaxio',mode:enabled?'local-simulation':'disabled',canTransmit:false,
  async simulate(requestId){
   if(!enabled)throw new Error('provider_adapter_disabled');
   if(typeof requestId!=='string'||!/^[a-f0-9-]{36}$/i.test(requestId))throw new Error('invalid_request_id');
   return Object.freeze({simulationId:crypto.randomUUID(),requestId,status:'SIMULATED',transmitted:false});
  },
  async sendFax(){throw new Error('fax_transmission_disabled')}
 });
}
module.exports={createPhaxioTestAdapter};
