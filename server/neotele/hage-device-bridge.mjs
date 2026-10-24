// NTEL-019: NEO Hage / Noogle Connect command bridge, strictly read-only.
// This maps language aliases to explicit device actions, never to a shell.
export const HAGE_NEOTELE_COMMANDS=Object.freeze({
 'neotele.device.esim_status':{capability:'device.esim.read',action:'READ_ESIM_STATUS'},
 'neotele.device.network_status':{capability:'device.network.read',action:'READ_NETWORK_STATUS'},
 'neotele.device.health':{capability:'device.health.read',action:'READ_DEVICE_HEALTH'}
});
export function createNeoTeleHageBridge({authenticate,authorizeDevice,dispatch,recordAudit}={}){
 for(const [name,fn] of Object.entries({authenticate,authorizeDevice,dispatch,recordAudit}))if(typeof fn!=='function')throw Error('adapter_required:'+name);
 return async function execute({sessionToken,deviceId,commandId,language='hage',approvalToken}={}){
  const command=HAGE_NEOTELE_COMMANDS[commandId];
  if(!command)throw Error('command_not_allowlisted');
  if(!['hage','nuwaubian','english'].includes(language))throw Error('language_not_supported');
  const identity=await authenticate(sessionToken);
  if(!identity?.verified||!identity.subject)throw Error('neopass_authentication_required');
  const grant=await authorizeDevice({subject:identity.subject,deviceId,capability:command.capability,approvalToken});
  if(!grant?.verified||grant.subject!==identity.subject||grant.deviceId!==deviceId||grant.capability!==command.capability)throw Error('device_authorization_required');
  const result=await dispatch({deviceId,action:command.action,authorizationId:grant.id});
  await recordAudit({subject:identity.subject,deviceId,commandId,authorizationId:grant.id,status:'REQUEST_COMPLETED'});
  return Object.freeze({action:command.action,result,readOnly:true,simProvisioningEnabled:false});
 };
}
