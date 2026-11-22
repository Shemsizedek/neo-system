'use strict';
// Draft-only NEO eFax bridge to the existing NVSN / NEO Wire architecture.
// No networking, no encryption keys, no signing, no Bitcoin RPC or fax transport.
const crypto=require('node:crypto');
const HEX64=/^[a-f0-9]{64}$/;
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const OPAQUE=/^[a-zA-Z0-9_-]{16,128}$/;
const NODE=/^[a-zA-Z0-9_.:-]{3,96}$/;
const PERMITTED=new Set(['tenantId','requestId','encryptedObjectRef','ciphertextSha256','sourceNodeId','destinationNodeId','ttlSeconds']);
function sha256(buffer){return crypto.createHash('sha256').update(buffer).digest();}
function validate(input){
 if(!input || typeof input!=='object' || Array.isArray(input))throw Error('invalid_intent');
 if(Object.keys(input).some(k=>!PERMITTED.has(k)))throw Error('unexpected_field_not_allowed');
 if(typeof input.tenantId!=='string'||!/^[a-zA-Z0-9_-]{1,64}$/.test(input.tenantId))throw Error('invalid_tenant');
 if(typeof input.requestId!=='string'||!UUID.test(input.requestId))throw Error('invalid_request_id');
 if(typeof input.encryptedObjectRef!=='string'||!OPAQUE.test(input.encryptedObjectRef))throw Error('invalid_encrypted_reference');
 if(typeof input.ciphertextSha256!=='string'||!HEX64.test(input.ciphertextSha256))throw Error('invalid_ciphertext_digest');
 if(typeof input.sourceNodeId!=='string'||!NODE.test(input.sourceNodeId)||
 typeof input.destinationNodeId!=='string'||!NODE.test(input.destinationNodeId))throw Error('invalid_nvsn_node');
 if(input.sourceNodeId===input.destinationNodeId)throw Error('same_source_and_destination');
 if(!Number.isSafeInteger(input.ttlSeconds)||input.ttlSeconds<60||input.ttlSeconds>86400)throw Error('invalid_ttl');
}
function prepareEncryptedFaxIntent(input,{clock=()=>new Date(),randomBytes=crypto.randomBytes}={}){
 validate(input);
 const now=clock();
 if(!(now instanceof Date)||!Number.isFinite(now.valueOf()))throw Error('invalid_clock');
 const salt=randomBytes(32);
 if(!Buffer.isBuffer(salt)||salt.length!==32)throw Error('secure_random_required');
 const leaf=sha256(Buffer.concat([
  Buffer.from('NEO-EFAX-COMMITMENT-V1\0','utf8'),salt,Buffer.from(input.ciphertextSha256,'hex'),
  Buffer.from(input.requestId,'utf8')
 ])).toString('hex');
 const expiresAt=new Date(now.getTime()+input.ttlSeconds*1000).toISOString();
 return Object.freeze({
  version:'NEO-EFAX/1',
  state:'PREPARED_OFFLINE',
  privateManifest:Object.freeze({
   tenantId:input.tenantId,requestId:input.requestId,
   encryptedObjectRef:input.encryptedObjectRef,ciphertextSha256:input.ciphertextSha256,
   commitmentSaltHex:salt.toString('hex'),
   createdAt:now.toISOString(),expiresAt
  }),
  nvsnIntent:Object.freeze({
   protocol:'NVSN/1.1',telegramType:'data',priority:'normal',
   source:input.sourceNodeId,destination:input.destinationNodeId,
   payloadKind:'NEO_EFAX_ENCRYPTED_OBJECT_REFERENCE_V1',
   expiresAt,state:'UNSIGNED_UNROUTED',dispatchable:false
  }),
  bitcoinProposal:Object.freeze({
   network:'UNSELECTED',commitmentLeaf:leaf,txid:null,confirmations:0,
   status:'NOT_BROADCAST',broadcastEnabled:false
  })
 });
}
function prepareBitcoinBatch(intents){
 if(!Array.isArray(intents)||intents.length<1||intents.length>1024)throw Error('invalid_batch_size');
 const raw=intents.map(x=>x?.bitcoinProposal?.commitmentLeaf);
 if(raw.some(v=>typeof v!=='string'||!HEX64.test(v)))throw Error('invalid_commitment_leaf');
 if(new Set(raw).size!==raw.length)throw Error('duplicate_commitment_leaf');
 // Distinct leaf and internal node domains; sorted input for deterministic independent proofs.
 let layer=raw.sort().map(hex=>sha256(Buffer.concat([Buffer.from([0]),Buffer.from(hex,'hex')])));
 while(layer.length>1){
  const next=[];
  for(let i=0;i<layer.length;i+=2){
   const right=layer[i+1]||layer[i];
   next.push(sha256(Buffer.concat([Buffer.from([1]),layer[i],right])));
  }
  layer=next;
 }
 return Object.freeze({
  standard:'NEO_EFAX_MERKLE_DRAFT_V1',blockchain:'bitcoin',
  commitmentCount:raw.length,merkleRootSha256:layer[0].toString('hex'),
  txid:null,confirmations:0,state:'PROPOSAL_ONLY_NOT_ANCHORED',broadcastEnabled:false
 });
}
const REQUIRED_EVIDENCE=[
 'trustedNeopassActor','recipientKeyValidated','encryptedObjectVerified','nvsnSignatureVerified',
 'routeAclVerified','independentMeshPeerReachable','durableQueueAndAckVerified'
];
function assessMeshDryRun(intent,evidence={},clock=()=>new Date()){
 if(intent?.state!=='PREPARED_OFFLINE')throw Error('invalid_prepared_intent');
 const now=clock();
 if(!(now instanceof Date)||!Number.isFinite(now.valueOf()))throw Error('invalid_clock');
 const expired=Date.parse(intent.privateManifest.expiresAt)<=now.valueOf();
 const missing=REQUIRED_EVIDENCE.filter(k=>evidence[k]!==true);
 if(expired)missing.push('ttl_expired');
 return Object.freeze({
  state:missing.length===0?'ELIGIBLE_FOR_REVIEWED_DRY_RUN':'BLOCKED',
  missing:Object.freeze(missing),canSend:false,canBroadcast:false,deliveryConfirmed:false,
  routeFamily:'NVSN_MESH_OR_NEOWIRE_AUTHORIZED_GATEWAY'
 });
}
function createDisabledExternalOperations(){
 return Object.freeze({
  async transmitFax(){throw Error('fax_transport_disabled')},
  async dispatchNvsn(){throw Error('nvsn_dispatch_disabled')},
  async broadcastBitcoin(){throw Error('bitcoin_broadcast_disabled')}
 });
}
module.exports={prepareEncryptedFaxIntent,prepareBitcoinBatch,assessMeshDryRun,createDisabledExternalOperations};
