// Provider adapter abstraction: simulation is deliberately incapable of real eSIM issuance.
export function createNeoTeleProviderSandbox() {
 return Object.freeze({
  environment:'SANDBOX_ONLY',
  async checkCompatibility({deviceRef}={}) {
   if(typeof deviceRef!=='string'||!deviceRef) throw Error('device_reference_required');
   return Object.freeze({deviceRef,verifiedByCarrier:false,eligible:false,reason:'CARRIER_INTEGRATION_NOT_CONFIGURED'});
  },
  async quotePlan() {return Object.freeze({available:false,reason:'NO_CONTRACTED_PROVIDER'});},
  async provision() {throw Error('LIVE_ESIM_PROVISIONING_DISABLED');},
  async issueActivationCode() {throw Error('LIVE_ESIM_PROVISIONING_DISABLED');},
  async activate() {throw Error('LIVE_ESIM_PROVISIONING_DISABLED');}
 });
}
