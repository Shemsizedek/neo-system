import {createCipheriv,createDecipheriv,randomBytes,createHash} from 'node:crypto';
// NEO-CROWN-035: backend primitives only. No identity provider, keys or DB configured.
const digest=b=>createHash('sha256').update(b).digest('hex');
export function authorize(context, action, caseRecord) {
 const deny=reason=>({allowed:false,reason});
 if(!context?.authenticated || !context?.mfaVerified || !context?.subject || !context?.tenantId) return deny('verified_session_required');
 if(!caseRecord?.tenantId || caseRecord.tenantId!==context.tenantId) return deny('tenant_mismatch');
 const roles={read:['client','reviewer','compliance','issuer','auditor'],upload:['client','reviewer'],review:['reviewer','compliance'],approve:['issuer','compliance'],audit:['auditor','compliance']};
 if(!roles[action]?.some(x=>context.roles?.includes(x))) return deny('role_denied');
 if(action==='approve' && caseRecord.createdBy===context.subject) return deny('self_approval_forbidden');
 return {allowed:true};
}
export function encryptEvidence(plaintext,{key,keyId,aad}) {
 if(!Buffer.isBuffer(key)||key.length!==32 || !keyId || !aad?.tenantId || !aad?.caseId) throw Error('invalid_encryption_context');
 const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
 const associated=Buffer.from(JSON.stringify({tenantId:aad.tenantId,caseId:aad.caseId,keyId}));
 cipher.setAAD(associated);
 const bytes=Buffer.isBuffer(plaintext)?plaintext:Buffer.from(plaintext);
 const data=Buffer.concat([cipher.update(bytes),cipher.final()]);
 return {schema:'NEO-EVIDENCE-ENVELOPE-V1',algorithm:'AES-256-GCM',keyId,iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:data.toString('base64'),plaintextSha256:digest(bytes),aad:associated.toString('base64')};
}
export function decryptEvidence(envelope,{key,tenantId,caseId}) {
 if(envelope?.schema!=='NEO-EVIDENCE-ENVELOPE-V1'||envelope.algorithm!=='AES-256-GCM'||!Buffer.isBuffer(key)||key.length!==32) throw Error('invalid_envelope');
 const associated=Buffer.from(JSON.stringify({tenantId,caseId,keyId:envelope.keyId}));
 if(envelope.aad!==associated.toString('base64')) throw Error('evidence_context_mismatch');
 const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));
 decipher.setAAD(associated);decipher.setAuthTag(Buffer.from(envelope.tag,'base64'));
 const bytes=Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,'base64')),decipher.final()]);
 if(digest(bytes)!==envelope.plaintextSha256) throw Error('hash_mismatch');
 return bytes;
}
export function evaluateApprovals(approvals,requiredRoles=['compliance','issuer']) {
 const accepted=(Array.isArray(approvals)?approvals:[]).filter(a=>a?.approved===true&&a?.mfaVerified===true&&a?.authenticated===true&&a?.evidenceHash&&a?.subject);
 const selected=[];for(const role of requiredRoles){const found=accepted.find(a=>a.role===role&&!selected.some(s=>s.subject===a.subject));if(!found)return {approved:false,reason:'independent_role_approval_missing'};selected.push(found);}
 return {approved:true,approvers:selected.map(a=>({subject:a.subject,role:a.role,evidenceHash:a.evidenceHash}))};
}
