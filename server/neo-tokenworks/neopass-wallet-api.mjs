import http from 'node:http';
import { createNeopassWalletProof } from './neopass-wallet-proof.mjs';
import { verifyBitcoinOwnership } from './neopass-bitcoin-verifier.mjs';

// Opt-in factory only: never mounted by the existing Tokenworks server.
// verifySession must validate issuer/audience/expiry/revocation server-side.
export function createNeopassWalletServer({ origin, verifySession, store, now = Date.now } = {}) {
  if (typeof verifySession !== 'function' || !store || ['insert','consumeAtomic','linkVerified','listLinked','revokeLinked'].some(k => typeof store[k] !== 'function')) throw Error('wallet_api_configuration_required');
  const proofs = createNeopassWalletProof({ origin, store, now, verifySignature: verifyBitcoinOwnership });
  const reply = (res, status, body) => {
    res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(JSON.stringify(body));
  };
  const authenticate = async req => {
    const header = req.headers.authorization;
    if (typeof header !== 'string' || !/^Bearer [A-Za-z0-9._~-]{1,8192}$/.test(header)) return null;
    const session = await verifySession(header.slice(7));
    return typeof session?.subject === 'string' && session.subject.length > 0 && typeof session.sessionId === 'string' && session.sessionId.length > 0 ? session : null;
  };
  return http.createServer(async (req, res) => {
    try {
      const path = new URL(req.url, origin).pathname;
      if (!['/api/v1/neopass/wallets','/api/v1/neopass/wallets/challenges','/api/v1/neopass/wallets/verify'].includes(path)) return reply(res,404,{error:'not_found'});
      if (req.headers.origin !== origin) return reply(res,403,{error:'origin_denied'});
      const session = await authenticate(req);
      if (!session) return reply(res,401,{error:'authentication_required'});
      if (req.method === 'GET' && path === '/api/v1/neopass/wallets') return reply(res,200,{wallets:store.listLinked(session.subject)});
      if (req.method !== 'POST') return reply(res,405,{error:'method_not_allowed'});
      if (req.headers['content-type']?.split(';')[0] !== 'application/json') return reply(res,415,{error:'json_required'});
      let size=0; const chunks=[];
      for await (const chunk of req) { size+=chunk.length; if(size>8192)return reply(res,413,{error:'request_too_large'}); chunks.push(chunk); }
      let body;
      try { body=JSON.parse(Buffer.concat(chunks).toString()); } catch { return reply(res,400,{error:'invalid_json'}); }
      if (!body || typeof body !== 'object' || Array.isArray(body)) return reply(res,400,{error:'invalid_body'});
      if (['subject','accountId','sessionId','verifiedAt'].some(k=>Object.hasOwn(body,k))) return reply(res,400,{error:'server_identity_required'});
      if (path.endsWith('/challenges')) {
        if (typeof body.address!=='string'||!body.address.length||body.address.length>256||/[\r\n\x00-\x1f]/.test(body.address)||!['bitcoin-mainnet','bitcoin-testnet','bitcoin-regtest'].includes(body.network)) return reply(res,400,{error:'invalid_wallet'});
        return reply(res,201,proofs.issue({subject:session.subject,sessionId:session.sessionId,address:body.address,network:body.network}));
      }
      if (path.endsWith('/verify')) {
        const proof=await proofs.verify({id:body.id,signature:body.signature,subject:session.subject,sessionId:session.sessionId});
        if (!proof) return reply(res,403,{error:'wallet_proof_rejected'});
        const current=await authenticate(req);
        if (!current || current.subject!==session.subject || current.sessionId!==session.sessionId) return reply(res,401,{error:'session_no_longer_valid'});
        if (!store.linkVerified(proof)) return reply(res,409,{error:'wallet_link_conflict'});
        return reply(res,200,{wallet:{address:proof.address,network:proof.network,verifiedAt:proof.verifiedAt}});
      }
      if (typeof body.address!=='string'||typeof body.network!=='string')return reply(res,400,{error:'invalid_wallet'});
      return reply(res,200,{revoked:store.revokeLinked({subject:session.subject,address:body.address,network:body.network,now:now()})});
    } catch { return reply(res,503,{error:'wallet_service_unavailable'}); }
  });
}
