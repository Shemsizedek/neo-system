import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
const encode=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
export function issueTellerAssertion({subject,sessionId},{secret,now=Date.now}={}){
 if(!secret||secret.length<32)throw new Error('teller_issuer_not_configured');
 if(typeof subject!=='string'||!/^google:[A-Za-z0-9_-]{2,150}$/.test(subject)||typeof sessionId!=='string'||!/^[A-Za-z0-9._:-]{8,100}$/.test(sessionId))throw new Error('invalid_teller_assertion');
 const claims={iss:'neo-teller',aud:'neo-bank',sub:subject,sid:sessionId,jti:randomUUID(),iat:now(),exp:now()+120000};
 const body=encode(claims),mac=createHmac('sha256',secret).update(body).digest('base64url');
 return body+'.'+mac;
}
export function verifyTellerAssertion(token,{secret,now=Date.now}={}){
 if(!secret||secret.length<32)throw new Error('teller_issuer_not_configured');
 if(typeof token!=='string'||token.length>8192||token.split('.').length!==2)throw new Error('teller_session_invalid');
 const [body,sig]=token.split('.'),expected=createHmac('sha256',secret).update(body).digest();
 let candidate;try{candidate=Buffer.from(sig,'base64url')}catch{throw new Error('teller_session_invalid')}
 if(candidate.length!==expected.length||!timingSafeEqual(candidate,expected))throw new Error('teller_session_invalid');
 let c;try{c=JSON.parse(Buffer.from(body,'base64url').toString())}catch{throw new Error('teller_session_invalid')}
 if(c.iss!=='neo-teller'||c.aud!=='neo-bank'||typeof c.sub!=='string'||typeof c.sid!=='string'||typeof c.jti!=='string'||!Number.isSafeInteger(c.iat)||!Number.isSafeInteger(c.exp)||c.iat>now()+30000||c.exp<=now()||c.exp-c.iat>120000)throw new Error('teller_session_invalid');
 return {verified:true,subject:c.sub,sessionId:c.sid,jti:c.jti,expiresAt:c.exp,canSign:false,canBroadcast:false};
}
