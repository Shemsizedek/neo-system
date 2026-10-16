import {createHash,createPublicKey,verify} from 'node:crypto';

const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const required = (value,name) => {if(typeof value!=='string'||!value.trim())throw Error(name+'_REQUIRED');return value};
const roles = new Set(['FLEET_ADMIN','MAINTENANCE_OPERATOR']);
const commands = new Set(['LOCK','REQUEST_DIAGNOSTICS','ENTER_MAINTENANCE']);
export function registerFleetDevice(input){
 const deviceId=required(input.deviceId,'DEVICE_ID');
 const publicKeyPem=required(input.publicKeyPem,'PUBLIC_KEY');
 createPublicKey(publicKeyPem);
 const group=required(input.group,'GROUP');
 return {deviceId,group,certificateFingerprint:digest(publicKeyPem),profile:input.profile||'ATM_STANDARD',state:'PENDING_ATTESTATION',cashOperationsEnabled:false};
}
export function verifyEnrollmentChallenge(device,challenge,signatureBase64,publicKeyPem){
 if(device.state!=='PENDING_ATTESTATION')throw Error('INVALID_ENROLLMENT_STATE');
 if(!challenge||!signatureBase64)throw Error('CHALLENGE_REQUIRED');
 if(digest(publicKeyPem)!==device.certificateFingerprint)throw Error('CERTIFICATE_MISMATCH');
 return verify('sha256',Buffer.from(challenge),createPublicKey(publicKeyPem),Buffer.from(signatureBase64,'base64'));
}
export function stageDeployment(input){
 const {releaseId,artifactSha256,group,approvals=[]}=input;
 required(releaseId,'RELEASE_ID');required(group,'GROUP');
 if(!/^[a-f0-9]{64}$/i.test(artifactSha256||''))throw Error('INVALID_ARTIFACT_DIGEST');
 if(!Array.isArray(approvals)||new Set(approvals).size<2)throw Error('TWO_APPROVALS_REQUIRED');
 return {releaseId,artifactSha256,group,stage:'CANARY',state:'AWAITING_DEVICE_ATTESTATION',autoInstall:false,rollbackRequired:true};
}
export function authorizeFleetCommand(input){
 if(!roles.has(input.operatorRole))throw Error('UNAUTHORIZED_ROLE');
 if(!commands.has(input.command))throw Error('COMMAND_NOT_ALLOWED');
 if(!input.deviceId||!input.reason||!input.requestId)throw Error('AUDIT_FIELDS_REQUIRED');
 if(input.command==='ENTER_MAINTENANCE'&&input.operatorRole!=='MAINTENANCE_OPERATOR')throw Error('MAINTENANCE_ROLE_REQUIRED');
 return {deviceId:input.deviceId,command:input.command,requestId:input.requestId,reason:input.reason,authorizedAt:new Date().toISOString(),auditHash:digest(input),remoteUnlock:false};
}
export function fleetStatus(devices=[]){return {total:devices.length,pending:devices.filter(x=>x.state==='PENDING_ATTESTATION').length,locked:devices.filter(x=>x.state==='LOCKED').length,active:devices.filter(x=>x.state==='ACTIVE').length};}
