import {DatabaseSync} from 'node:sqlite';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse} from '@simplewebauthn/server';

const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new Error(message)};
const actions=new Set(['document.sign','document.approve','vote.cast']);
const defaults={generateRegistrationOptions,verifyRegistrationResponse,generateAuthenticationOptions,verifyAuthenticationResponse};

// Trusted server-only API. Never pass request-body identity/authorization callbacks here.
export function createApprovalService({dbPath, rpID, origin, authorize, sessionIsActive, resolveResource, webauthn=defaults, now=Date.now}) {
  const url=new URL(origin);
  if(url.protocol!=='https:' || url.origin!==origin || url.hostname!==rpID) fail('exact_https_rp_origin_required');
  if(!dbPath || ![authorize,sessionIsActive,resolveResource].every(fn=>typeof fn==='function')) fail('trusted_server_adapters_required');
  const db=new DatabaseSync(dbPath);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS pass_credentials(id TEXT PRIMARY KEY,subject TEXT NOT NULL,public_key BLOB NOT NULL,counter INTEGER NOT NULL,transports TEXT NOT NULL,device_type TEXT NOT NULL,backed_up INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS pass_challenges(id TEXT PRIMARY KEY,subject TEXT NOT NULL,session_hash TEXT NOT NULL,purpose TEXT NOT NULL,challenge TEXT NOT NULL,envelope TEXT NOT NULL,expires INTEGER NOT NULL,used INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS pass_approvals(id TEXT PRIMARY KEY,subject TEXT NOT NULL,action TEXT NOT NULL,institution TEXT NOT NULL,resource TEXT NOT NULL,version TEXT NOT NULL,envelope TEXT NOT NULL,evidence TEXT NOT NULL,created INTEGER NOT NULL,UNIQUE(subject,action,institution,resource,version));
    CREATE TABLE IF NOT EXISTS pass_outbox(id TEXT PRIMARY KEY,commitment TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'PENDING');`);
  const transaction=fn=>{db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e}};
  function session(ctx) {
    if(!ctx?.subject || !ctx?.sessionID || sessionIsActive(ctx)!==true) fail('active_server_session_required');
  }
  function permit(ctx,action,resource) {session(ctx);if(authorize(ctx,action,resource)!==true) fail('permission_denied')}
  function put(ctx,purpose,challenge,envelope) {
    const id=randomUUID();db.prepare('INSERT INTO pass_challenges VALUES(?,?,?,?,?,?,?,0)').run(id,ctx.subject,hash(ctx.sessionID),purpose,challenge,JSON.stringify(envelope),now()+120000);return id;
  }
  function get(ctx,id,purpose) {
    session(ctx);const row=db.prepare('SELECT * FROM pass_challenges WHERE id=?').get(id);
    if(!row || row.subject!==ctx.subject || row.session_hash!==hash(ctx.sessionID) || row.purpose!==purpose || row.used || row.expires<=now()) fail('invalid_expired_or_consumed_challenge');return row;
  }
  function consume(ctx,id,purpose) {get(ctx,id,purpose);if(db.prepare('UPDATE pass_challenges SET used=1 WHERE id=? AND used=0').run(id).changes!==1) fail('challenge_replayed')}
  function credentials(subject) {return db.prepare('SELECT * FROM pass_credentials WHERE subject=? AND revoked=0').all(subject)}
  const shape=row=>({id:row.id,publicKey:new Uint8Array(row.public_key),counter:row.counter,transports:JSON.parse(row.transports)});
  async function registrationOptions(ctx) {
    permit(ctx,'device.enroll',null);
    const options=await webauthn.generateRegistrationOptions({rpName:'NEO Pass',rpID,userID:new Uint8Array(createHash('sha256').update(ctx.subject).digest()),userName:ctx.subject,attestationType:'none',authenticatorSelection:{residentKey:'required',userVerification:'required'},excludeCredentials:credentials(ctx.subject).map(shape)});
    session(ctx);return {challengeID:put(ctx,'registration',options.challenge,{}),options};
  }
  async function register(ctx,challengeID,response) {
    permit(ctx,'device.enroll',null);const row=get(ctx,challengeID,'registration');
    const result=await webauthn.verifyRegistrationResponse({response,expectedChallenge:row.challenge,expectedOrigin:origin,expectedRPID:rpID,requireUserVerification:true});
    if(!result.verified || !result.registrationInfo) fail('registration_not_verified');
    const {credential,credentialDeviceType,credentialBackedUp}=result.registrationInfo;
    return transaction(()=>{permit(ctx,'device.enroll',null);consume(ctx,challengeID,'registration');db.prepare('INSERT INTO pass_credentials VALUES(?,?,?,?,?,?,?,0)').run(credential.id,ctx.subject,credential.publicKey,credential.counter,JSON.stringify(credential.transports||[]),credentialDeviceType,Number(credentialBackedUp));return {credentialID:credential.id,deviceType:credentialDeviceType,backedUp:credentialBackedUp}});
  }
  function resourceFor(ctx,request) {
    if(!actions.has(request?.action) || !request.institution || !request.resourceID) fail('unsupported_action');
    const resource=resolveResource(ctx,request);
    if(!resource || resource.institution!==request.institution || resource.id!==request.resourceID || typeof resource.version!=='string' || !/^[a-f0-9]{64}$/.test(resource.digest) || typeof resource.policyVersion!=='string') fail('verified_resource_required');
    permit(ctx,request.action,resource);
    if(request.action==='vote.cast' && (resource.ballotPrivacy!=='public' || !resource.choices?.includes(request.choice) || !Number.isFinite(resource.opensAt) || !Number.isFinite(resource.closesAt) || resource.opensAt>now() || resource.closesAt<=now())) fail('ballot_unavailable');
    return resource;
  }
  async function approvalOptions(ctx,request) {
    const resource=resourceFor(ctx,request);const registered=credentials(ctx.subject);if(!registered.length) fail('enrolled_device_required');
    const envelope={action:request.action,institution:resource.institution,resourceID:resource.id,version:resource.version,digest:resource.digest,policyVersion:resource.policyVersion,choice:request.action==='vote.cast'?request.choice:null,subject:ctx.subject,nonce:randomBytes(32).toString('base64url')};
    const challenge=Buffer.from(JSON.stringify(envelope)).toString('base64url');
    const options=await webauthn.generateAuthenticationOptions({rpID,challenge,allowCredentials:registered.map(shape),userVerification:'required'});
    session(ctx);return {challengeID:put(ctx,'approval',options.challenge,envelope),options,envelope};
  }
  async function approve(ctx,challengeID,response) {
    const row=get(ctx,challengeID,'approval');const envelope=JSON.parse(row.envelope);
    const credential=credentials(ctx.subject).find(c=>c.id===response?.id);if(!credential) fail('credential_unavailable');
    const result=await webauthn.verifyAuthenticationResponse({response,expectedChallenge:row.challenge,expectedOrigin:origin,expectedRPID:rpID,credential:shape(credential),requireUserVerification:true});
    if(!result.verified || !result.authenticationInfo?.userVerified) fail('assertion_not_verified');
    return transaction(()=>{
      get(ctx,challengeID,'approval');const current=resourceFor(ctx,{...envelope,resourceID:envelope.resourceID});
      if(current.version!==envelope.version || current.digest!==envelope.digest || current.policyVersion!==envelope.policyVersion) fail('resource_changed');
      const stored=credentials(ctx.subject).find(c=>c.id===credential.id);if(!stored || stored.counter!==credential.counter) fail('credential_changed');
      const id=randomUUID();const evidence=JSON.stringify({response,origin,rpID,userVerified:true,verifiedAt:now(),credentialID:credential.id});
      consume(ctx,challengeID,'approval');
      db.prepare('INSERT INTO pass_approvals VALUES(?,?,?,?,?,?,?,?,?)').run(id,ctx.subject,envelope.action,envelope.institution,envelope.resourceID,envelope.version,row.envelope,evidence,now());
      db.prepare('UPDATE pass_credentials SET counter=? WHERE id=?').run(result.authenticationInfo.newCounter,credential.id);
      db.prepare('INSERT INTO pass_outbox(id,commitment) VALUES(?,?)').run(id,hash(row.envelope+'\n'+evidence));
      return {approvalID:id,status:'RECORDED',crownStatus:'PENDING',envelope};
    });
  }
  function revoke(ctx,credentialID) {permit(ctx,'device.revoke',null);db.prepare('UPDATE pass_credentials SET revoked=1 WHERE id=? AND subject=?').run(credentialID,ctx.subject)}
  return {registrationOptions,register,approvalOptions,approve,revoke,close:()=>db.close()};
}
