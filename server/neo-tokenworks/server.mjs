import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createTokenworks } from './tokenworks.mjs';

const json = (res, status, body) => {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type':'application/json; charset=utf-8', 'content-length':Buffer.byteLength(payload), 'access-control-allow-origin':'*', 'cache-control':'no-store' });
  res.end(payload);
};
const readBody = async req => {
  const chunks=[]; let size=0;
  for await (const chunk of req) { size += chunk.length; if (size > 32768) throw new Error('request_too_large'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
};

export function createTokenworksServer({ tokenworks = createTokenworks() } = {}) {
  return http.createServer(async (req,res) => {
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204, {'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization'}); return res.end(); }
      const url = new URL(req.url || '/', 'http://neo.local');
      if (req.method === 'GET' && url.pathname === '/health') return json(res,200,{ok:true,service:'neo-tokenworks',mode:'ORIGIN_SANDBOX'});
      if (req.method === 'GET' && url.pathname === '/api/v1/tokenworks/capabilities') return json(res,200,tokenworks.capabilities());
      if (req.method === 'POST' && url.pathname === '/api/v1/neopass/challenges') return json(res,201,tokenworks.issueAddressChallenge(await readBody(req)));
      if (req.method === 'POST' && url.pathname === '/api/v1/neopass/leases') return json(res,201,tokenworks.grantSharedAccess(await readBody(req)));
      const revoke = url.pathname.match(/^\/api\/v1\/neopass\/leases\/([^/]+)\/revoke$/);
      if (req.method === 'POST' && revoke) { const row=tokenworks.revokeSharedAccess(revoke[1]); return row?json(res,200,row):json(res,404,{error:'lease_not_found'}); }
      if (req.method === 'POST' && url.pathname === '/api/v1/tokenworks/escrow-plans') return json(res,201,tokenworks.composeEscrowPlan(await readBody(req)));
      return json(res,404,{error:'not_found'});
    } catch (error) { return json(res,error.message==='request_too_large'?413:400,{error:error.message}); }
  });
}
export function startTokenworksServer({port=Number(process.env.NEO_TOKENWORKS_PORT||8794)}={}) { const server=createTokenworksServer(); server.listen(port,()=>console.log(`NEO Tokenworks sandbox listening on :${port}`)); return server; }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startTokenworksServer();
