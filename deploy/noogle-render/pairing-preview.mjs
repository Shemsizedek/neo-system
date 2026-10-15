import { randomBytes, timingSafeEqual } from 'node:crypto';

const ttlMs = 5 * 60_000;
const limit = 100;
const sessions = new Map();
const token = () => randomBytes(24).toString('base64url');
const code = () => String(randomBytes(4).readUInt32BE() % 1_000_000).padStart(6,'0');
const same = (a,b) => typeof a==='string' && typeof b==='string' &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a),Buffer.from(b));
function prune(now) {
  for(const [id,s] of sessions) if(s.expiresAt<=now) sessions.delete(id);
}
export function createPairingPreview(now=()=>Date.now()) {
  function get(id,role,credential) {
    prune(now());
    const s=sessions.get(id);
    if(!s || !same(s[role],credential)) return null;
    return s;
  }
  return {
    create() {
      prune(now());
      if(sessions.size >= limit) return {status:429,body:{error:'capacity_reached'}};
      const id=token(),owner=token(),pairCode=code();
      const session={owner,pairCode,joiner:null,state:'pending',attempts:0,expiresAt:now()+ttlMs};
      sessions.set(id,session);
      return {status:201,body:{id,owner,code:pairCode,expiresAt:session.expiresAt,mode:'staging-demonstration',permissions:[]}};
    },
    join({id,code:submitted}) {
      prune(now());
      const s=sessions.get(id);
      if(!s || s.state!=='pending' || s.attempts>=5) return {status:403,body:{error:'pairing_unavailable'}};
      if(!same(s.pairCode,submitted)) {s.attempts++;return {status:403,body:{error:'pairing_unavailable'}};}
      const joiner=token();
      s.joiner=joiner;s.state='awaiting_approval';s.pairCode=null;
      return {status:200,body:{id,joiner,state:s.state,permissions:[]}};
    },
    approve({id,owner}) {
      const s=get(id,'owner',owner);
      if(!s || s.state!=='awaiting_approval') return {status:403,body:{error:'approval_not_authorized'}};
      s.state='approved_preview';
      return {status:200,body:{state:s.state,permissions:[],deviceEnrolled:false,remoteTerminal:false}};
    },
    status({id,credential}) {
      const s=get(id,'owner',credential)||get(id,'joiner',credential);
      if(!s)return {status:403,body:{error:'session_not_authorized'}};
      return {status:200,body:{state:s.state,expiresAt:s.expiresAt,permissions:[],deviceEnrolled:false,remoteTerminal:false}};
    }
  };
}
