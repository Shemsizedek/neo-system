/** NSEC-026: server-owned authorization checks, not an HTTP handler. */
import { createHash, timingSafeEqual, randomBytes } from 'node:crypto';
import { verifyNoogleIdentity } from './identity-bridge.mjs';

const digest=value=>createHash('sha256').update(value).digest();
function equalSecret(a,b){if(typeof a!=='string'||typeof b!=='string'||!a||!b)return false;const x=digest(a),y=digest(b);return timingSafeEqual(x,y);}

export class EnrollmentAuthorization {
  #sessions=new Map();
  constructor({secret,issuer='neo-pass',clock=()=>Date.now(),maxAgeMs=5*60*1000}={}){
    if(!secret)throw Error('NEO_PASS_VERIFIER_SECRET_REQUIRED');
    this.secret=secret;this.issuer=issuer;this.clock=clock;this.maxAgeMs=maxAgeMs;
  }
  establish(token,{freshProofValidated=false}={}){
    // Trusted server code may set freshProofValidated only after an independent
    // recent authentication check; never map this from an HTTP request body.
    if(freshProofValidated!==true)throw Error('fresh_authentication_required');
    const identity=verifyNoogleIdentity(token,{secret:this.secret,issuer:this.issuer,now:this.clock});
    if(!identity)throw Error('identity_verification_failed');
    const id=randomBytes(32).toString('base64url');
    const csrf=randomBytes(32).toString('base64url');
    this.#sessions.set(digest(id).toString('hex'),{
      subject:identity.subject,csrfHash:digest(csrf).toString('hex'),created:this.clock(),revoked:false
    });
    return {sessionId:id,csrfToken:csrf,subject:identity.subject};
  }
  authorize(sessionId,csrfToken){
    const item=this.#sessions.get(digest(String(sessionId||'')).toString('hex'));
    if(!item||item.revoked||this.clock()-item.created>this.maxAgeMs||this.clock()<item.created)
      throw Error('enrollment_session_invalid');
    if(typeof csrfToken!=='string'||!csrfToken||!timingSafeEqual(digest(csrfToken),Buffer.from(item.csrfHash,'hex')))throw Error('csrf_invalid');
    return Object.freeze({subject:item.subject});
  }
  revoke(sessionId){
    const key=digest(String(sessionId||'')).toString('hex');
    const s=this.#sessions.get(key);if(!s)return false;s.revoked=true;return true;
  }
  terminal(){throw Error('remote_terminal_disabled');}
}
