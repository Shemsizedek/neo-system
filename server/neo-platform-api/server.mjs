import http from 'node:http';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createNeoPrimeMarketData } from '../neo-prime/market-data.mjs';
import { createTeraBoxRuntime } from '../storage/terabox/runtime.mjs';
import crypto from 'node:crypto';

export const PLATFORM_REGISTRY = {
  neopay: { name: 'NEOpay', source: ['apps/neopay', 'src/neopay'], services: ['wallet', 'portfolio', 'transaction-compose', 'dex-quotes'] },
  'neo-teller': { name: 'NEO Teller', source: ['server/neo-teller-backend'], services: ['atm-session', 'deposit-status', 'withdrawal-status', 'fx-quotes'] },
  'neo-books': { name: 'NEO Books', source: ['src/books'], services: ['chart-of-accounts', 'ledger-status', 'treasury-summary', 'reports'] },
  'neo-prime': { name: 'NEO Prime', source: ['server/neo-prime'], services: ['markets', 'research', 'quotes', 'signals'] },
  'neo-exchange': { name: 'NEO Exchange', source: ['neo-system market stack'], services: ['markets', 'orders-read', 'quotes', 'settlement-compose'] },
  'neo-generator': { name: 'NEO Generator', source: ['server/miner-generator'], services: ['products', 'hashpower-quotes', 'contracts-read', 'capacity'] },
  'neo-miner': { name: 'NEO Miner', source: ['src/miner', 'server/miner-agent', 'server/miner-controller', 'server/miner-commerce'], services: ['fleet', 'telemetry', 'jobs-read', 'commerce-read'] },
  'neo-tokenworks': { name: 'NEO Tokenworks', source: ['server/neo-tokenworks'], services: ['neopass', 'address-proof', 'shared-access', 'escrow-planning', 'token-tracking'] },
  'neo-banks': { name: 'NEO Banks', source: ['server/neo-tokenworks', 'server/nibiru-reserve', 'server/neo-teller-backend', 'apps/neopay'], services: ['token-lending-sandbox', 'neopass-consumer', 'ces-position-observation', 'iso-20022-translation', 'compliance-gates'] },
  'nibiru-reserve': { name: 'Nibiru Reserve System', source: ['server/nibiru-reserve', 'server/neo-tokenworks'], services: ['ces-position-observation', 'blockchain-settlement-linkage', 'reserve-snapshot', 'iso-20022-canonical-mapping', 'reconciliation-gates'] }
};

const OCI_SERVICE_REGISTRY = JSON.parse(readFileSync(new URL('../../infra/oci/neo-system-services.json', import.meta.url), 'utf8'));

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {'content-type':'application/json; charset=utf-8','content-length':Buffer.byteLength(payload),'access-control-allow-origin':'*','cache-control':'no-store'});
  res.end(payload);
}

function intParam(url, name, fallback, { min = 1, max = 100 } = {}) {
  const raw = url.searchParams.get(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`invalid ${name}`);
  return value;
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && crypto.timingSafeEqual(a, b);
}

function operatorAuthorized(req, env) {
  const expected = env.NEO_OPERATOR_API_TOKEN;
  const header = req.headers.authorization || '';
  return Boolean(expected) && header.startsWith('Bearer ') && safeEqual(header.slice(7), expected);
}

export function createNeoPlatformApi({ now = () => new Date().toISOString(), marketData = createNeoPrimeMarketData({ now }), teraboxRuntime = createTeraBoxRuntime({ now }), env = process.env } = {}) {
  return http.createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') { res.writeHead(204, {'access-control-allow-origin':'*','access-control-allow-methods':'GET,OPTIONS','access-control-allow-headers':'content-type,authorization'}); return res.end(); }
      if (req.method !== 'GET') return json(res,405,{error:'method_not_allowed',readOnly:true});
      const url = new URL(req.url || '/', 'http://neo.local');
      const isTeraBoxRoute = url.pathname.startsWith('/api/v1/storage/terabox/');
      if (isTeraBoxRoute && !operatorAuthorized(req, env)) return json(res,401,{error:'operator_auth_required'});
      const teraBoxLiveMode = env.TERABOX_LIVE_MODE || 'read-only';
      if (isTeraBoxRoute && teraBoxLiveMode !== 'read-only') return json(res,503,{error:'terabox_safe_mode_required',requiredMode:'read-only'});
      if (url.pathname === '/health') return json(res,200,{service:'neo-platform-api',status:'ok',generatedAt:now(),platforms:Object.keys(PLATFORM_REGISTRY).length,ociRegisteredServices:OCI_SERVICE_REGISTRY.services.length});
      if (url.pathname === '/api/v1/platforms') return json(res,200,{apiVersion:'v1',generatedAt:now(),platforms:Object.entries(PLATFORM_REGISTRY).map(([id,value])=>({id,name:value.name,services:value.services}))});
      if (url.pathname === '/api/v1/oci/services') return json(res,200,{apiVersion:'v1',generatedAt:now(),...OCI_SERVICE_REGISTRY});

      if (url.pathname === '/api/v1/storage/terabox/status') {
        return json(res,200,{apiVersion:'v1',generatedAt:now(),...(await teraboxRuntime.status())});
      }
      if (url.pathname === '/api/v1/storage/terabox/auth-url') {
        if (!teraboxRuntime.configured()) return json(res,503,{error:'terabox_not_configured',required:['TERABOX_CLIENT_ID','TERABOX_CLIENT_SECRET','TERABOX_PRIVATE_SECRET']});
        return json(res,200,{apiVersion:'v1',provider:'terabox',authorizationUrl:teraboxRuntime.authorizationUrl()});
      }
      if (url.pathname === '/api/v1/storage/terabox/callback') {
        if (!teraboxRuntime.configured()) return json(res,503,{error:'terabox_not_configured',required:['TERABOX_CLIENT_ID','TERABOX_CLIENT_SECRET','TERABOX_PRIVATE_SECRET']});
        const code=url.searchParams.get('code');
        if (!code) return json(res,400,{error:'missing_authorization_code'});
        const state=url.searchParams.get('state');
        if (!state) return json(res,400,{error:'missing_oauth_state'});
        return json(res,200,{apiVersion:'v1',provider:'terabox',...(await teraboxRuntime.complete(code,state))});
      }
      if (url.pathname === '/api/v1/storage/terabox/user') {
        const client = await teraboxRuntime.client();
        return json(res,200,{apiVersion:'v1',provider:'terabox',readOnly:true,data:await client.userInfo()});
      }
      if (url.pathname === '/api/v1/storage/terabox/quota') {
        const client = await teraboxRuntime.client();
        return json(res,200,{apiVersion:'v1',provider:'terabox',readOnly:true,data:await client.quota()});
      }
      if (url.pathname === '/api/v1/storage/terabox/files') {
        return json(res,403,{error:'terabox_operation_disabled',liveMode:'read-only'});
        const dir = url.searchParams.get('dir');
        if (!dir) return json(res,400,{error:'missing_dir'});
        const page = intParam(url,'page',1,{min:1,max:100000});
        const num = intParam(url,'num',100,{min:1,max:100});
        const client = await teraboxRuntime.client();
        return json(res,200,{apiVersion:'v1',provider:'terabox',readOnly:true,data:await client.list({dir,page,num})});
      }
      if (url.pathname === '/api/v1/storage/terabox/search') {
        return json(res,403,{error:'terabox_operation_disabled',liveMode:'read-only'});
        const key = url.searchParams.get('key');
        if (!key) return json(res,400,{error:'missing_key'});
        const page = intParam(url,'page',1,{min:1,max:100000});
        const num = intParam(url,'num',100,{min:1,max:100});
        const client = await teraboxRuntime.client();
        return json(res,200,{apiVersion:'v1',provider:'terabox',readOnly:true,data:await client.search({key,page,num})});
      }
      if (url.pathname === '/api/v1/storage/terabox/download-links') {
        return json(res,403,{error:'terabox_operation_disabled',liveMode:'read-only'});
        const raw = url.searchParams.get('fids');
        if (!raw) return json(res,400,{error:'missing_fids'});
        const fids = raw.split(',').map(v=>v.trim()).filter(Boolean).slice(0,100);
        if (!fids.length) return json(res,400,{error:'missing_fids'});
        const client = await teraboxRuntime.client();
        return json(res,200,{apiVersion:'v1',provider:'terabox',readOnly:true,sensitive:true,data:await client.downloadLinks(fids)});
      }

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
