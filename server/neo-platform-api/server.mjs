import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createNeoPrimeMarketData } from '../neo-prime/market-data.mjs';

export const PLATFORM_REGISTRY = {
  neopay: { name: 'NEOpay', source: ['apps/neopay', 'src/neopay'], services: ['wallet', 'portfolio', 'transaction-compose', 'dex-quotes'] },
  'neo-teller': { name: 'NEO Teller', source: ['server/neo-teller-backend'], services: ['atm-session', 'deposit-status', 'withdrawal-status', 'fx-quotes'] },
  'neo-books': { name: 'NEO Books', source: ['src/books'], services: ['chart-of-accounts', 'ledger-status', 'treasury-summary', 'reports'] },
  'neo-prime': { name: 'NEO Prime', source: ['server/neo-prime'], services: ['markets', 'research', 'quotes', 'signals'] },
  'neo-exchange': { name: 'NEO Exchange', source: ['neo-system market stack'], services: ['markets', 'orders-read', 'quotes', 'settlement-compose'] },
  'neo-generator': { name: 'NEO Generator', source: ['server/miner-generator'], services: ['products', 'hashpower-quotes', 'contracts-read', 'capacity'] },
  'neo-miner': { name: 'NEO Miner', source: ['src/miner', 'server/miner-agent', 'server/miner-controller', 'server/miner-commerce'], services: ['fleet', 'telemetry', 'jobs-read', 'commerce-read'] },
  'neo-tokenworks': { name: 'NEO Tokenworks', source: ['server/neo-tokenworks'], services: ['neopass', 'address-proof', 'shared-access', 'escrow-planning', 'token-tracking'] },
  'neo-banks': { name: 'NEO Banks', source: ['server/neo-tokenworks', 'server/neo-teller-backend', 'apps/neopay'], services: ['token-lending-sandbox', 'neopass-consumer', 'escrow-planning', 'compliance-gates'] }
};

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(payload),'access-control-allow-origin':'*','cache-control':'no-store'});
  res.end(payload);
}

export function createNeoPlatformApi({ now = () => new Date().toISOString(), marketData = createNeoPrimeMarketData({ now }) } = {}) {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204, {'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'content-type,authorization'}); return res.end(); }
      if (req.method !== 'GET') return json(res,405,{error:'method_not_allowed',readOnly:true});
      const url = new URL(req.url || '/', 'http://neo.local');
      if (url.pathname === '/health') return json(res,200,{service:'neo-platform-api',status:'ok',generatedAt:now(),platforms:Object.keys(PLATFORM_REGISTRY).length});
      if (url.pathname === '/api/v1/platforms') return json(res,200,{apiVersion:'v1',generatedAt:now(),platforms:Object.entries(PLATFORM_REGISTRY).map(([id,value])=>({id,name:value.name,services:value.services}))});
      if (url.pathname === '/api/v1/prime/markets') { const assets=(url.searchParams.get('assets')||'XCP,NOMNI').split(',').map(v=>v.trim()).filter(Boolean).slice(0,20); return json(res,200,await marketData.snapshot({assets})); }
      const primeAssetMatch=url.pathname.match(/^\/api\/v1\/prime\/assets\/([^/]+)$/);
      if (primeAssetMatch) return json(res,200,await marketData.asset(primeAssetMatch[1]));
      const match=url.pathname.match(/^\/api\/v1\/platforms\/([^/]+)(?:\/(health|capabilities))?$/);
      if (match) {
        const [,id,action='capabilities']=match; const item=PLATFORM_REGISTRY[id];
        if (!item) return json(res,404,{error:'platform_not_found',platform:id});
        if (action==='health') return json(res,200,{platform:id,name:item.name,status:'ok',generatedAt:now(),readOnly:true});
        return json(res,200,{platform:id,name:item.name,status:'ready',generatedAt:now(),readOnly:true,source:item.source,services:item.services,transactionalExecution:'disabled-until-auth-and-runtime-binding'});
      }
      return json(res,404,{error:'not_found'});
    } catch (error) { return json(res,502,{error:'upstream_failure',message:error?.message||'unknown error'}); }
  });
}
export function startNeoPlatformApi({port=Number(process.env.PORT||8787)}={}) { const server=createNeoPlatformApi(); server.listen(port,()=>console.log(`NEO Platform API listening on :${port}`)); return server; }
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) startNeoPlatformApi();
