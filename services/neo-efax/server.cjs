// NEO eFax API v0.1: operational HTTP service; live telephone transport not configured.
// No taxpayer documents are persisted. Never expose without an authenticated gateway.
const http = require('node:http');
const crypto = require('node:crypto');
const port = Number(process.env.PORT || 10000);
const token = process.env.NEO_EFAX_API_TOKEN;
const jobs = new Map();
function reply(res, code, data) {
  res.writeHead(code, {'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'});
  res.end(JSON.stringify(data));
}
const server = http.createServer(async (req,res) => {
  if (req.url === '/health' && req.method === 'GET') return reply(res,200,{service:'neo-efax',status:'online',transport:'unconfigured',liveFaxEnabled:false});
  if (!token || !crypto.timingSafeEqual(Buffer.from(crypto.createHash('sha256').update(req.headers.authorization || '').digest()),Buffer.from(crypto.createHash('sha256').update('Bearer '+token).digest()))) return reply(res,401,{error:'unauthorized'});
  if (req.url === '/v1/capabilities' && req.method === 'GET') return reply(res,200,{api:'v1',transport:'unconfigured',canSubmitFax:false,canTrackJobs:true});
  if (req.url === '/v1/faxes' && req.method === 'GET') return reply(res,200,{jobs:[...jobs.values()]});
  if (req.url === '/v1/faxes' && req.method === 'POST') return reply(res,503,{error:'fax_transport_not_connected',message:'No fax submitted. Carrier/SIP trunk and receipt verification are required before live fax transmission.'});
  return reply(res,404,{error:'not_found'});
});
server.listen(port,'0.0.0.0');
